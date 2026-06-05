import React from "react";
import DatePicker from "react-datepicker";
import { Calendar } from "lucide-react";
import "react-datepicker/dist/react-datepicker.css";

interface DatePickerInputProps {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  className?: string;
  minDate?: Date;
}

const DatePickerInput: React.FC<DatePickerInputProps> = ({
  selected,
  onChange,
  placeholder = "Select date",
  className = "",
  minDate,
}) => {
  return (
    <div className="relative">
      <DatePicker
        selected={selected}
        onChange={onChange}
        placeholderText={placeholder}
        minDate={minDate}
        dateFormat="MMM dd, yyyy"
        className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${className}`}
      />
      <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  );
};

export default DatePickerInput;
