import React from 'react';
import LottieLoader from './LottieLoader';

const LoadingScreen = ({ message = "Loading..." }) => {
  return (
    <div className="d-flex flex-column justify-content-center align-items-center vh-100 bg-light">
      <LottieLoader size={150} />
      <h5 className="mt-3 text-muted">{message}</h5>
    </div>
  );
};

export default LoadingScreen;