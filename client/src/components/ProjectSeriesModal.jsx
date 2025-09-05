import { Modal, Form, Button } from "react-bootstrap";

export default function ProjectSeriesModal({
  show,
  onHide,
  projectSeriesInput,
  onInputChange,
  onSubmit
}) {
  const handleCancel = () => {
    onHide();
    onInputChange('');
  };

  return (
    <Modal show={show} onHide={handleCancel}>
      <Modal.Header closeButton>
        <Modal.Title>Project Series Required</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>The uploaded Excel file does not contain a project series. Please enter the project series for this data:</p>
        <Form.Group className="mb-3">
          <Form.Label>Project Series</Form.Label>
          <Form.Control
            type="text"
            value={projectSeriesInput}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="Enter project series (e.g., 2024-001)"
            autoFocus
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onSubmit}>
          Continue Detection
        </Button>
      </Modal.Footer>
    </Modal>
  );
}