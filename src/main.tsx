import { render } from 'preact'
import config from '../portfolio.config.ts'
import { applyTheme, savedTheme } from './theme.ts'
import { Terminal } from './Terminal.tsx'
import './style.css'

applyTheme(savedTheme())
document.documentElement.dataset.layout = config.layout
render(<Terminal />, document.getElementById('app')!)
