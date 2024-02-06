import 'dotenv/config'

import { WebAPI } from './index' // Stop From Sorting

// Start API (may be moved elsewhere later)
const api = new WebAPI()
api.start()
