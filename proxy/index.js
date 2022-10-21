const express = require('express')
const axios = require('axios')
const app = express()
const port = process.env.PORT || 3000;

app.get('*', async (req, res) => {
  try {
    const { data } = await axios.get(`https://widgets.mindbodyonline.com${req.url}`);
    res.send(data)
  } catch (e) {
    console.log(e)
    const { status, data } = e.response;
    data.pipe(res.status(status))
  }
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})