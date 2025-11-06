import React from 'react'
import ReactDOM from 'react-dom/client'
import ErrorThresholdSimulator from './ErrorThresholdSimulator'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorThresholdSimulator />
  </React.StrictMode>,
)
