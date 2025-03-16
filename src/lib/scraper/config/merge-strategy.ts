/**
 * Data Merge Strategy Configuration
 * 
 * Defines how new data should be merged with existing data in the database.
 * This allows for precise control over updating records.
 */

export type MergeStrategy = 
  | 'never_overwrite'        // Never overwrite existing data
  | 'always_overwrite'       // Always overwrite with new data
  | 'overwrite_if_changed'   // Overwrite only if data has changed
  | 'overwrite_if_empty';    // Overwrite only if existing data is empty

export interface ColumnMergeStrategy {
  columnName: string;
  strategy: MergeStrategy;
  compareFunction?: (oldValue: any, newValue: any) => boolean;
}

/**
 * Merge strategies for database columns
 */
export const mergeStrategies: ColumnMergeStrategy[] = [
  // Core fields that should rarely or never change
  {
    columnName: "address",
    strategy: "never_overwrite"
  },
  {
    columnName: "english_address",
    strategy: "never_overwrite"
  },
  {
    columnName: "listing_url",
    strategy: "never_overwrite"
  },
  
  // Fields that may change and should be updated
  {
    columnName: "is_sold",
    strategy: "overwrite_if_changed",
    compareFunction: (old, new_) => old !== new_
  },
  {
    columnName: "price",
    strategy: "overwrite_if_changed",
    compareFunction: (old, new_) => Math.abs(old - new_) > 0.01
  },
  {
    columnName: "status",
    strategy: "overwrite_if_changed",
    compareFunction: (old, new_) => old !== new_
  },
  
  // Fields that should only be filled if empty
  {
    columnName: "listing_images",
    strategy: "overwrite_if_empty"
  },
  {
    columnName: "lat",
    strategy: "overwrite_if_empty"
  },
  {
    columnName: "long",
    strategy: "overwrite_if_empty"
  },
  {
    columnName: "recommended_text",
    strategy: "overwrite_if_empty"
  },
  
  // Metadata fields that should always be updated
  {
    columnName: "last_updated",
    strategy: "always_overwrite"
  }
];

/**
 * Default merge strategy for columns not explicitly defined
 */
export const defaultMergeStrategy: ColumnMergeStrategy = {
  columnName: "*",
  strategy: "never_overwrite"
}; 