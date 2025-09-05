import { Container, Alert } from "react-bootstrap";
import { useState } from "react";
import api from "../api/axios";
import ProgressTracker from "../components/ProgressTracker";
import DuplicateTable from "../components/DuplicateTable";
import OriginalsTable from "../components/OriginalsTable";
import PossibleDuplicatesCard from "../components/PossibleDuplicatesCard";
import LottieLoader from "../components/LottieLoader";
import FileUploadForm from "../components/FileUploadForm";
import DetectionSummary from "../components/DetectionSummary";
import ProjectSeriesModal from "../components/ProjectSeriesModal";
import DuplicatesModal from "../components/DuplicatesModal";
import { useDuplicateDetection } from "../hooks/useDuplicateDetection";
import { downloadDuplicatesAsExcel } from "../utils/excelUtils";
import { getMatchTypeStats, filterByMatchType, getReviewZoneItems } from "../utils/unifiedDuplicateDetection";


export default function DetectDuplicate() {
  const [file, setFile] = useState(null);

  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);
  const [useSimpleAlgorithm, setUseSimpleAlgorithm] = useState(false);
  const [selectedMatchType, setSelectedMatchType] = useState('ALL');
  const [showProjectSeriesModal, setShowProjectSeriesModal] = useState(false);
  const [projectSeriesInput, setProjectSeriesInput] = useState('');
  const [pendingExcelData, setPendingExcelData] = useState(null);
  
  const {
    loading,
    error,
    compareResult,
    progress,
    compareFile,
    duplicates,
    filteredDuplicates,
    searchTerm,
    similarityThreshold,
    isProcessing,
    detectDuplicates,
    searchDuplicates,
    updateThreshold,
    clearResults
  } = useDuplicateDetection();

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const checkProjectSeries = (data) => {
    if (!data || data.length === 0) return true;
    return data.some(row => row.project_series || row['Project Series'] || row['PROJECT SERIES']);
  };

  const addProjectSeriesToData = (data, projectSeries) => {
    return data.map(row => ({
      ...row,
      project_series: projectSeries,
      'Project Series': projectSeries,
      'PROJECT SERIES': projectSeries
    }));
  };

  const handleCompare = async () => {
    const result = await compareFile(file);
    
    if (result) {
      // Get ALL Excel data and ALL database records for fuzzy matching
      const formData = new FormData();
      formData.append('excelFile', file);
      
      try {
        // Read Excel data
        const excelResponse = await api.post('/api/get-excel-data', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        let excelData = excelResponse.data.excelData || [];
        
        // Check if project series exists
        if (!checkProjectSeries(excelData)) {
          setPendingExcelData(excelData);
          setShowProjectSeriesModal(true);
          return;
        }
        
        // Get all database records
        const dbResponse = await api.get('/api/uploaded-beneficiaries');
        const dbRecords = dbResponse.data || [];
        
        if (excelData.length > 0 && dbRecords.length > 0) {
          await detectDuplicates(excelData, dbRecords, similarityThreshold);
        }
      } catch (error) {
        console.error('Client-side detection failed:', error);
      }
    }
  };

  const handleProjectSeriesSubmit = async () => {
    if (!projectSeriesInput.trim()) {
      alert('Please enter a project series');
      return;
    }

    try {
      const updatedExcelData = addProjectSeriesToData(pendingExcelData, projectSeriesInput.trim());
      
      // Get all database records
      const dbResponse = await api.get('/api/uploaded-beneficiaries');
      const dbRecords = dbResponse.data || [];
      
      if (updatedExcelData.length > 0 && dbRecords.length > 0) {
        await detectDuplicates(updatedExcelData, dbRecords, similarityThreshold);
      }
      
      // Close modal and reset states
      setShowProjectSeriesModal(false);
      setProjectSeriesInput('');
      setPendingExcelData(null);
    } catch (error) {
      console.error('Error processing with project series:', error);
      alert('Error processing file with project series');
    }
  };



  const handleClear = () => {
    setFile(null);
    clearResults();
    setSelectedMatchType('ALL');
  };

  // Get match statistics
  const matchStats = duplicates.length > 0 ? getMatchTypeStats(duplicates) : null;
  
  // Filter duplicates by selected match type
  const getFilteredDuplicates = () => {
    if (selectedMatchType === 'ALL') return duplicates;
    if (selectedMatchType === 'REVIEW_ZONE') return getReviewZoneItems(duplicates);
    return filterByMatchType(duplicates, selectedMatchType);
  };

  // Create unified comparison result for compatibility
  const unifiedCompareResult = {
    ...compareResult,
    duplicates: getFilteredDuplicates(),
    totalDuplicates: duplicates.length
  };


  return (
    <Container fluid className="p-4 flex-grow-1">
      <h2>Detect Duplicate Names</h2>

      <FileUploadForm
        file={file}
        onFileChange={handleFileChange}
        useSimpleAlgorithm={useSimpleAlgorithm}
        onAlgorithmChange={(e) => setUseSimpleAlgorithm(e.target.checked)}
        similarityThreshold={similarityThreshold}
        onThresholdChange={(e) => updateThreshold(parseInt(e.target.value))}
        onCompare={handleCompare}
        onClear={handleClear}
        loading={loading}
        isProcessing={isProcessing}
      />

      {/* Progress Tracker */}
      {(loading || progress.status !== 'idle') && (
        <ProgressTracker
          progress={progress.percentage}
          total={progress.total}
          processed={progress.processed}
          duplicatesFound={progress.duplicatesFound}
          status={progress.status}
          showDetails={true}
        />
      )}

      {/* Loading / Error */}
      {loading && !progress.total && (
        <div className="d-flex justify-content-center my-4">
          <LottieLoader size={80} />
        </div>
      )}
      
      {error && <Alert variant="danger">{error}</Alert>}

      {/* Comparison Results */}
      {compareResult && (
        <>
          <DetectionSummary
            compareResult={compareResult}
            matchStats={matchStats}
            duplicates={duplicates}
            selectedMatchType={selectedMatchType}
            onMatchTypeChange={(e) => setSelectedMatchType(e.target.value)}
            onViewAllNames={() => setShowDuplicatesModal(true)}
          />

          <PossibleDuplicatesCard duplicates={getFilteredDuplicates()} />

          <DuplicateTable
            compareResult={unifiedCompareResult}
            searchTerm={searchTerm}
            onSearch={searchDuplicates}
            filteredDuplicates={filteredDuplicates.filter(dup => 
              selectedMatchType === 'ALL' || 
              selectedMatchType === 'REVIEW_ZONE' ? dup.in_review_zone : 
              dup.match_type === selectedMatchType
            )}
            onDownload={() => downloadDuplicatesAsExcel(unifiedCompareResult)}
          />

          <OriginalsTable compareResult={compareResult} />
        </>
      )}


      <ProjectSeriesModal
        show={showProjectSeriesModal}
        onHide={() => {
          setShowProjectSeriesModal(false);
          setProjectSeriesInput('');
          setPendingExcelData(null);
        }}
        projectSeriesInput={projectSeriesInput}
        onInputChange={setProjectSeriesInput}
        onSubmit={handleProjectSeriesSubmit}
      />

      <DuplicatesModal
        show={showDuplicatesModal}
        onHide={() => setShowDuplicatesModal(false)}
        duplicates={duplicates}
      />
    </Container>
        
  );
}
