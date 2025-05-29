import express, { Request, Response, RequestHandler } from 'express'
import { agent } from '../agents/veramoAgent.js'
import sanitizeHtml from 'sanitize-html';

const mcpRoutes: express.Router = express.Router()

const handleMcpRequest: RequestHandler = (req, res) => {
  const { type, sender, payload } = req.body

  const challenge = 'hello world ....'
  if (type == 'PresentationRequest') {
    console.info("----------> received presentation request and returning challenge")
    res.json({
        type: 'Challenge',
        challenge: challenge
    })
    return
  }

  if (type === 'AskForService') {
    try {
      console.info("----------> received client request with verifiable presentation ")

      const didHolder = sanitizeHtml(payload.presentation.holder as string)

      console.info("client did: ", didHolder)

      agent.resolveDid({
          didUrl: didHolder
      }).then(result => {

        console.info("client did document: ", result)

        const presentation = payload.presentation

        return agent.verifyPresentationEIP1271({
            presentation
        })
      }).then(verificationResult => {

        console.info("are we good here?: ", verificationResult)
        if (verificationResult) {
          console.info("client is verified, lets process the request ")

          res.json({
            type: 'ServiceList',
            services: [
              { name: 'Lawn Hero', location: 'Erie', rating: 4.8 },
              { name: 'GreenCare Co', location: 'Erie', rating: 4.5 },
            ],
          })
        } else {
          res.status(500).json({ error: 'verifiable presentation is not valid' })
        }
        
      }).catch(error => {
        console.error("Error processing request:", error)
        res.status(500).json({ error: 'Internal server error' })
      })
    } catch (error) {
      console.error("Error processing request:", error)
      res.status(500).json({ error: 'Internal server error' })
    }
    return
  }

  res.status(400).json({ error: 'Unsupported MCP type' })
}

mcpRoutes.post('/', handleMcpRequest)

export default mcpRoutes
