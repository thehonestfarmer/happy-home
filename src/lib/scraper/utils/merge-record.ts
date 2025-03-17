import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger';

/**
 * Strategy for merging data into an existing record
 */
export enum MergeStrategy {
  NEVER_OVERWRITE = 'never_overwrite',
  ALWAYS_OVERWRITE = 'always_overwrite',
  OVERWRITE_IF_CHANGED = 'overwrite_if_changed',
  OVERWRITE_IF_EMPTY = 'overwrite_if_empty'
}

/**
 * Configuration for a column's merge strategy
 */
interface ColumnMergeStrategy {
  columnName: string;
  strategy: MergeStrategy;
  compareFunction?: (oldValue: any, newValue: any) => boolean;
}

/**
 * Default merge strategies for the real estate listings table
 */
const defaultMergeStrategies: ColumnMergeStrategy[] = [
  {
    columnName: "address",
    strategy: MergeStrategy.NEVER_OVERWRITE
  },
  {
    columnName: "listing_url",
    strategy: MergeStrategy.NEVER_OVERWRITE
  },
  {
    columnName: "is_sold",
    strategy: MergeStrategy.OVERWRITE_IF_CHANGED,
    compareFunction: (old, new_) => old !== new_
  },
  {
    columnName: "price",
    strategy: MergeStrategy.OVERWRITE_IF_CHANGED,
    compareFunction: (old, new_) => Math.abs(old - new_) > 0.01 // Account for floating point
  },
  {
    columnName: "listing_images",
    strategy: MergeStrategy.OVERWRITE_IF_EMPTY
  },
  {
    columnName: "lat",
    strategy: MergeStrategy.OVERWRITE_IF_EMPTY
  },
  {
    columnName: "long",
    strategy: MergeStrategy.OVERWRITE_IF_EMPTY
  },
  {
    columnName: "english_address",
    strategy: MergeStrategy.OVERWRITE_IF_EMPTY
  },
  {
    columnName: "about_property",
    strategy: MergeStrategy.OVERWRITE_IF_EMPTY
  },
  {
    columnName: "last_updated",
    strategy: MergeStrategy.ALWAYS_OVERWRITE
  }
];

/**
 * Merge new data into an existing record with intelligent strategies
 */
export const mergeRecordData = async (
  supabase: SupabaseClient,
  tableName: string,
  uniqueIdentifier: { column: string, value: any },
  newData: Record<string, any>,
  customStrategies?: ColumnMergeStrategy[]
): Promise<{ data: any, error: any }> => {
  try {
    // Use custom strategies if provided, otherwise use defaults
    const mergeStrategies = customStrategies || defaultMergeStrategies;
    
    // 1. Fetch existing record
    const { data: existingRecord, error: fetchError } = await supabase
      .from(tableName)
      .select('*')
      .eq(uniqueIdentifier.column, uniqueIdentifier.value)
      .single();
    
    if (fetchError) {
      logger.error(`Error fetching existing record: ${fetchError.message}`);
      
      // If the record doesn't exist, just insert the new data
      if (fetchError.code === 'PGRST116') { // PostgreSQL error for not found
        logger.info(`Record not found, inserting new data`);
        return await supabase
          .from(tableName)
          .insert(newData)
          .select()
          .single();
      }
      
      return { data: null, error: fetchError };
    }
    
    // 2. Apply merge strategies
    const updatedData: Record<string, any> = {};
    
    for (const column in newData) {
      const strategy = mergeStrategies.find(s => s.columnName === column) || {
        columnName: column,
        strategy: MergeStrategy.NEVER_OVERWRITE // Default strategy
      };
      
      switch (strategy.strategy) {
        case MergeStrategy.NEVER_OVERWRITE:
          // Skip if value already exists
          if (existingRecord[column] === null || existingRecord[column] === undefined) {
            updatedData[column] = newData[column];
            logger.debug(`Column ${column}: Applying NEVER_OVERWRITE strategy, value was empty`);
          } else {
            logger.debug(`Column ${column}: Skipping due to NEVER_OVERWRITE strategy`);
          }
          break;
          
        case MergeStrategy.ALWAYS_OVERWRITE:
          updatedData[column] = newData[column];
          logger.debug(`Column ${column}: Applying ALWAYS_OVERWRITE strategy`);
          break;
          
        case MergeStrategy.OVERWRITE_IF_CHANGED:
          if (strategy.compareFunction) {
            if (strategy.compareFunction(existingRecord[column], newData[column])) {
              updatedData[column] = newData[column];
              logger.debug(`Column ${column}: Applying OVERWRITE_IF_CHANGED with custom compare, value changed`);
            } else {
              logger.debug(`Column ${column}: No change detected with custom compare function`);
            }
          } else if (existingRecord[column] !== newData[column]) {
            updatedData[column] = newData[column];
            logger.debug(`Column ${column}: Applying OVERWRITE_IF_CHANGED, value changed from ${existingRecord[column]} to ${newData[column]}`);
          } else {
            logger.debug(`Column ${column}: No change detected with standard compare`);
          }
          break;
          
        case MergeStrategy.OVERWRITE_IF_EMPTY:
          if (existingRecord[column] === null || existingRecord[column] === undefined || 
              (Array.isArray(existingRecord[column]) && existingRecord[column].length === 0) ||
              (typeof existingRecord[column] === 'string' && existingRecord[column].trim() === '')) {
            updatedData[column] = newData[column];
            logger.debug(`Column ${column}: Applying OVERWRITE_IF_EMPTY, value was empty`);
          } else {
            logger.debug(`Column ${column}: Not empty, preserving existing value`);
          }
          break;
      }
    }
    
    // 3. Update record if changes exist
    if (Object.keys(updatedData).length > 0) {
      logger.info(`Updating record with ${Object.keys(updatedData).length} changed fields`);
      
      // Always update last_updated timestamp if not already included
      if (!updatedData.last_updated) {
        updatedData.last_updated = new Date().toISOString();
      }
      
      const { data, error } = await supabase
        .from(tableName)
        .update(updatedData)
        .eq(uniqueIdentifier.column, uniqueIdentifier.value)
        .select()
        .single();
        
      if (error) {
        logger.error(`Error updating record: ${error.message}`);
        return { data: null, error };
      }
      
      logger.success(`Successfully updated record with ${Object.keys(updatedData).length} fields`);
      return { data, error: null };
    }
    
    // No changes needed
    logger.info(`No changes needed for record`);
    return { data: existingRecord, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error in mergeRecordData: ${errorMessage}`);
    return { data: null, error };
  }
}; 