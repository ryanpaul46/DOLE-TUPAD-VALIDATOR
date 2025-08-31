import { Card } from 'react-bootstrap';
import SmartUpload from './SmartUpload';
import DirectUpload from './DirectUpload';

export default function AdminControls({ data, onDataRefresh }) {
  return (
    <Card className="mb-4">
      <Card.Header>Admin Controls</Card.Header>
      <Card.Body>
        <SmartUpload data={data} onDataRefresh={onDataRefresh} />
        <hr />
        <DirectUpload onDataRefresh={onDataRefresh} />
      </Card.Body>
    </Card>
  );
}