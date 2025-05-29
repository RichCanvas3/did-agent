import express, { Request, Response } from 'express'
import { agent } from '../agents/veramoAgent.js'
import sanitizeHtml from 'sanitize-html';

const mcpRoutes: express.Router = express.Router()

mcpRoutes.post('/', async (req: Request, res: Response) => {
  const { type, sender, payload } = req.body


  const challenge = 'hello world ....'
  if (type == 'PresentationRequest') {
    return res.json({
        type: 'Challenge',
        challenge: challenge
    })
  }

  if (type === 'AskForService') {

    console.info("received payload: ", JSON.stringify(payload, null, 2))

    const didHolder = sanitizeHtml(payload.presentation.holder as string)
    console.info("did holder: ", didHolder)
    //'did:ethr:0x1:0x9cfc7e44757529769a28747f86425c682fe64653'
    //'did:ethr:0x1:0x9cfc7e44757529769a28747f86425c682fe64653'
    //const didHolder = 'did:ethr:0x1:0x9cfc7e44757529769a28747f86425c682fe64653'
    const result = await agent.resolveDid({
        didUrl: didHolder
    })
    console.info("resolve did: ", result)


    const presentation = payload.presentation
    //if (presentation.proof.challenge == challenge) {
        const verificationResult = await agent.verifyPresentationEIP1271({
            presentation
        })
        console.info("verification ............: ", verificationResult)
    //}
    //else {
    //    console.info("verification challenge not correct: ", presentation.proof.challenge)
    //}


    
    // Process request and respond with a PresentationRequest or VPs
    console.info("done so return to client: ")

    return res.json({
      type: 'ServiceList',
      services: [
        { name: 'Lawn Hero', location: 'Erie', rating: 4.8 },
        { name: 'GreenCare Co', location: 'Erie', rating: 4.5 },
      ],
    })
  }

  res.status(400).json({ error: 'Unsupported MCP type' })
})

export default mcpRoutes
