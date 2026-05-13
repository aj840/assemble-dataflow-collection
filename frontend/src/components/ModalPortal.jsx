import { createPortal } from 'react-dom';

/**
 * ModalPortal renders its children into document.body via a React Portal.
 * This ensures modals are always positioned relative to the viewport,
 * regardless of any ancestor overflow, transform, or stacking context issues.
 */
export default function ModalPortal({ children }) {
  return createPortal(children, document.body);
}
