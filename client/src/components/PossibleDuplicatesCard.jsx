import { Card, Badge, Row, Col } from 'react-bootstrap';

export default function PossibleDuplicatesCard({ duplicates }) {
  if (!duplicates?.length) return null;

  const highlightDifferences = (str1, str2) => {
    if (!str1) return <span className="text-muted">-</span>;
    const s1 = str1.toLowerCase();
    const s2 = (str2 || '').toLowerCase();
    const result = [];
    
    for (let i = 0; i < str1.length; i++) {
      const char = str1[i];
      const isDifferent = i >= s2.length || s1[i] !== s2[i];
      result.push(
        <span key={i} className={isDifferent ? 'bg-warning text-dark' : ''}>
          {char}
        </span>
      );
    }
    return result;
  };

  const getComponentValue = (dup, component, isExcel = true) => {
    if (isExcel) {
      const componentMap = {
        first: 'First Name',
        middle: 'Middle Name', 
        last: 'Last Name'
      };
      return dup.excel_row?.data?.[componentMap[component]] || '';
    } else {
      const componentMap = {
        first: 'first_name',
        middle: 'middle_name',
        last: 'last_name'
      };
      return dup.database_record?.[componentMap[component]] || '';
    }
  };

  return (
    <Card className="mb-4">
      <Card.Header className="text-warning">
        <strong>Possible Duplicate Names ({duplicates.length} found)</strong>
      </Card.Header>
      <Card.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
        {duplicates.map((dup, idx) => (
          <div key={idx} className="mb-4 p-3 border rounded bg-light">
            {/* Full Name Comparison */}
            <Row className="mb-3">
              <Col md={5}>
                <div className="fw-bold text-primary mb-1">Excel Full Name:</div>
                <div className="font-monospace fs-6">
                  {highlightDifferences(dup.excel_name, dup.db_name)}
                </div>
              </Col>
              <Col md={2} className="text-center d-flex align-items-center justify-content-center">
                <Badge bg="secondary" className="fs-6">
                  {dup.similarity_score}%
                </Badge>
              </Col>
              <Col md={5}>
                <div className="fw-bold text-info mb-1">Database Full Name:</div>
                <div className="font-monospace fs-6">
                  {highlightDifferences(dup.db_name, dup.excel_name)}
                </div>
              </Col>
            </Row>
            
            {/* Component Breakdown */}
            {dup.component_scores && (
              <div className="border-top pt-2">
                <div className="fw-bold text-secondary mb-2">Name Components:</div>
                {['first', 'middle', 'last'].map(component => {
                  const excelValue = getComponentValue(dup, component, true);
                  const dbValue = getComponentValue(dup, component, false);
                  const score = dup.component_scores[`${component}_name`];
                  
                  if (!excelValue && !dbValue) return null;
                  
                  return (
                    <Row key={component} className="mb-1 small">
                      <Col md={2} className="fw-bold text-capitalize">
                        {component}:
                      </Col>
                      <Col md={4}>
                        <span className="font-monospace">
                          {highlightDifferences(excelValue, dbValue)}
                        </span>
                      </Col>
                      <Col md={2} className="text-center">
                        <Badge bg={score >= 80 ? 'success' : score >= 60 ? 'warning' : 'danger'} className="small">
                          {Math.round(score)}%
                        </Badge>
                      </Col>
                      <Col md={4}>
                        <span className="font-monospace">
                          {highlightDifferences(dbValue, excelValue)}
                        </span>
                      </Col>
                    </Row>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </Card.Body>
    </Card>
  );
}