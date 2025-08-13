import * as React from "react";
import { cn } from "../../lib/utils";

interface NavigationProps {
  className?: string;
  children?: React.ReactNode;
}

const Navigation = React.forwardRef<HTMLDivElement, NavigationProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <nav
        ref={ref}
        className={cn(
          "flex h-screen w-64 flex-col bg-white border-r border-slate-200",
          className
        )}
        {...props}
      >
        {children}
      </nav>
    );
  }
);
Navigation.displayName = "Navigation";

const NavigationHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex h-16 items-center border-b border-slate-200 px-4", className)}
        {...props}
      />
    );
  }
);
NavigationHeader.displayName = "NavigationHeader";

const NavigationList = React.forwardRef<HTMLUListElement, React.HTMLAttributes<HTMLUListElement>>(
  ({ className, ...props }, ref) => {
    return (
      <ul
        ref={ref}
        className={cn("flex flex-col space-y-1 p-4", className)}
        {...props}
      />
    );
  }
);
NavigationList.displayName = "NavigationList";

interface NavigationItemProps extends React.LiHTMLAttributes<HTMLLIElement> {
  active?: boolean;
}

const NavigationItem = React.forwardRef<HTMLLIElement, NavigationItemProps>(
  ({ className, active, ...props }, ref) => {
    return (
      <li
        ref={ref}
        className={cn(
          "rounded-md px-3 py-2 text-sm font-medium transition-colors",
          active
            ? "bg-okuru-primary text-white"
            : "text-slate-700 hover:bg-slate-100",
          className
        )}
        {...props}
      />
    );
  }
);
NavigationItem.displayName = "NavigationItem";

const NavigationFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("mt-auto border-t border-slate-200 p-4", className)}
        {...props}
      />
    );
  }
);
NavigationFooter.displayName = "NavigationFooter";

export { Navigation, NavigationHeader, NavigationList, NavigationItem, NavigationFooter };
