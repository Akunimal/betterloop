import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import './webmcp/polyfill'
import App from './App'
import { registerMagicPickerTool } from './webmcp/magicPickerTool'

// Register before the first render so an agent can discover the tool as soon
// as the page becomes available.
void registerMagicPickerTool()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
