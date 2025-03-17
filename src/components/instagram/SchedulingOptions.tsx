import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface SchedulingOptionsProps {
  postScheduleType: "now" | "later";
  setPostScheduleType: (value: "now" | "later") => void;
  scheduledDate: Date | undefined;
  setScheduledDate: (date: Date | undefined) => void;
}

export default function SchedulingOptions({
  postScheduleType,
  setPostScheduleType,
  scheduledDate,
  setScheduledDate
}: SchedulingOptionsProps) {
  const { toast } = useToast();

  return (
    <div className="space-y-4">
      <Separator className="my-4" />
      
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">When to Post</label>
      </div>
      
      <RadioGroup 
        value={postScheduleType} 
        onValueChange={(value) => {
          setPostScheduleType(value as "now" | "later");
          // Reset the scheduled date when switching to "now"
          if (value === "now") {
            setScheduledDate(undefined);
          }
        }}
        className="flex flex-col space-y-2"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="now" id="post-now" />
          <Label htmlFor="post-now" className="cursor-pointer">Post immediately</Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="later" id="post-later" />
          <Label htmlFor="post-later" className="cursor-pointer">Schedule for later</Label>
        </div>
      </RadioGroup>
      
      {postScheduleType === "later" && (
        <div className="pt-2 space-y-2">
          <p className="text-sm text-gray-500">Select date and time for posting:</p>
          <div className="relative">
            <input
              type="datetime-local"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              value={scheduledDate ? scheduledDate.toISOString().slice(0, 16) : ''}
              onChange={(e) => {
                const dateValue = e.target.value;
                if (dateValue) {
                  const newDate = new Date(dateValue);
                  // Ensure the date is valid and in the future
                  if (!isNaN(newDate.getTime()) && newDate > new Date()) {
                    setScheduledDate(newDate);
                  } else if (newDate <= new Date()) {
                    toast({
                      title: "Invalid Date",
                      description: "Please select a future date and time",
                      variant: "destructive",
                    });
                  }
                } else {
                  setScheduledDate(undefined);
                }
              }}
              min={new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)}
            />
            {!scheduledDate && postScheduleType === "later" && (
              <p className="text-xs text-amber-600 mt-1">
                Please select when you want to publish this post
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 