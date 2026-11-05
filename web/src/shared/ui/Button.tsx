import type { ButtonHTMLAttributes } from 'react';

import styles from './Button.module.css';
import { cx } from './cx';

type ButtonVariant = 'primary' | 'light' | 'danger' | 'gold';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** Takes the full width of its container. */
  block?: boolean;
}

/** Base button with a 44 px touch target (RF-UX-06). */
export function Button({
  variant = 'primary',
  block = false,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(styles.button, styles[variant], block && styles.block, className)}
      {...rest}
    />
  );
}
