/**
 * @fileoverview Main entry point for the HarborList boat marketplace React application.
 * 
 * This file initializes the React application with strict mode enabled for development
 * warnings and renders the root App component into the DOM.
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'

/**
 * Initialize and render the React application
 * 
 * Creates the React root element and renders the main App component wrapped in
 * React.StrictMode for enhanced development experience with additional checks
 * and warnings.
 * 
 * @throws {Error} If the root DOM element is not found
 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
