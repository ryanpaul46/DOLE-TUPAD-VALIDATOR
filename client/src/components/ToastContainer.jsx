import { Toast, ToastContainer as BSToastContainer } from 'react-bootstrap';

export default function ToastContainer({ toasts, onClose }) {
  return (
    <BSToastContainer position="top-end" className="p-3" style={{ zIndex: 9999 }}>
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          onClose={() => onClose(toast.id)}
          show={true}
          delay={3000}
          autohide
          bg={toast.variant}
        >
          <Toast.Body className="text-white">
            {toast.message}
          </Toast.Body>
        </Toast>
      ))}
    </BSToastContainer>
  );
}