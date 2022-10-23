const express = require('express')
const axios = require('axios')
const app = express()
const port = process.env.PORT || 3000;

const  fetch = async (url, attemptNumber = 1) => {
  try {
    const { data } = await axios.get(`https://widgets.mindbodyonline.com${url}`);
    return data
  } catch (e) {
    if (attemptNumber === 3) {
      console.log(e)
      return;
    } else {
      return await fetch(url, attemptNumber + 1)
    }
  }
}

app.get('*', async (req, res) => {
  const data = await fetch(req.url);
  if (data) {
    res.send(data)
  } else {
    res.status(500).send('something went wrong :(')
  }
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})