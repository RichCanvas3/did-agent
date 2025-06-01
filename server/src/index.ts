import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import mcpRoutes from './routes/mcp.js'



const app = express()
app.use(cors())
app.use(express.json())

app.use('/mcp', mcpRoutes)


app.listen(3001, () => console.log('MCP Server running on http://localhost:3001'))
