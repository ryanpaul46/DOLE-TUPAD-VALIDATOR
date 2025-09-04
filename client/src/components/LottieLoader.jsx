import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const LottieLoader = ({ size = 200, className = "" }) => {
  return (
    <div className={`d-flex justify-content-center align-items-center ${className}`}>
      <div style={{ width: size, height: size }}>
        <DotLottieReact
          src="https://lottie.host/a58b846b-2b02-47c4-bea7-2f00b93f0c47/BkDDvizrrw.lottie"
          loop
          autoplay
        />
      </div>
    </div>
  );
};

export default LottieLoader;