import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background shadow-sm",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-md hover:translate-y-[-1px] active:translate-y-[0px]",
        secondary: "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:shadow-md hover:translate-y-[-1px] active:translate-y-[0px]",
        outline: "border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 text-gray-700 hover:shadow-sm",
        ghost: "hover:bg-gray-100 text-gray-700",
        link: "underline-offset-4 hover:underline text-blue-600 hover:text-blue-700 p-0 h-auto shadow-none",
        danger: "bg-gradient-to-r from-red-500 to-red-600 text-white hover:shadow-md hover:translate-y-[-1px] active:translate-y-[0px]",
      },
      size: {
        default: "h-10 py-2 px-5",
        sm: "h-9 px-4 rounded-md text-xs",
        lg: "h-11 px-8 rounded-md text-base",
        icon: "h-10 w-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
