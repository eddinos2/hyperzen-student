import { NavLink as RouterNavLink, NavLinkProps as RouterNavLinkProps } from 'react-router-dom';
import { ReactNode } from 'react';

interface NavLinkProps extends Omit<RouterNavLinkProps, 'className'> {
  activeClassName?: string;
  className?: string | ((props: { isActive: boolean }) => string);
  children: ReactNode;
}

export function NavLink({ activeClassName, className, children, ...props }: NavLinkProps) {
  return (
    <RouterNavLink
      {...props}
      className={(navProps) => {
        const baseClass = typeof className === 'function' ? className({ isActive: navProps.isActive }) : className || '';
        const activeClass = navProps.isActive && activeClassName ? ` ${activeClassName}` : '';
        return `${baseClass}${activeClass}`;
      }}
    >
      {children}
    </RouterNavLink>
  );
}