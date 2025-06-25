const express = require("express")
const cors = require("cors")
const puppeteer = require("puppeteer")

const app = express()

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN
  })
)

app.use(express.json())

async function scrape({
  zip,
  birthdate,
  gender,
  smoke,
  health,
  term,
  amount,
  rating
}) {
  birthdate = new Date(birthdate)
  smoke = smoke === "true" || smoke === true
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  const page = await browser.newPage()
  await page.goto("https://www.term4sale.ca/")
  await page.screenshot({ path: "ss0.png" })
  // ------- page for where data is inputed ---------
  await page.type("#zipcode", zip)
  await page.select(
    'select[name="BirthMonth"]',
    String(birthdate.getMonth() + 1)
  )
  await page.select('select[name="BirthDay"]', String(birthdate.getDate()))
  await page.select('select[name="BirthYear"]', String(birthdate.getFullYear()))
  await page.screenshot({ path: "ss01.png" })
  await page.evaluate(gender => {
    const input = document.querySelector(
      gender === "male" ? 'input[value="M"]' : 'input[value="F"]'
    )
    const label = input?.closest("label")
    if (label) label.click()
  }, gender)
  await page.evaluate(smoke => {
    const input = document.querySelector(
      smoke === false ? 'input[value="N"]' : 'input[value="Y"]'
    )
    const label = input?.closest("label")
    if (label) label.click()
  }, smoke)
  await page.select(
    'select[name="Health"]',
    health === "exceptional"
      ? "PP"
      : health === "excellent"
      ? "P"
      : health === "above average"
      ? "RP"
      : "R"
  )
  await page.select(
    'select[name="NewCategory"]',
    term === "10 yr"
      ? "3"
      : term === "15 yr"
      ? "4"
      : term === "20 yr"
      ? "5"
      : term === "25 yr"
      ? "6"
      : term === "30 yr"
      ? "7"
      : term === "35 yr"
      ? "9"
      : term === "40 yr"
      ? "0"
      : term === "to 65"
      ? "A"
      : term === "to 70"
      ? "B"
      : term === "to 75"
      ? "C"
      : term === "to 100"
      ? "P"
      : term === "other"
      ? "F"
      : term === "10, 20, 65"
      ? "Z:35A#12"
      : term === "10, 20, 30, 65"
      ? "Z:357A#12"
      : term === "all level"
      ? "Z:3456790ABCP"
      : term === "whole life"
      ? "H"
      : term === "whole life, pay to 65"
      ? "I"
      : term === "whole life, 20 pay"
      ? "J"
      : term === "whole life, 15 pay"
      ? "K"
      : "S"
  ) //'Z:35A#12'
  await page.select('select[name="FaceAmount"]', amount)
  await page.select(
    'select[name="CompRating"]',
    rating === "superior"
      ? "1"
      : rating === "excellent"
      ? "3"
      : rating === "very good"
      ? "5"
      : rating === "adequate"
      ? "7"
      : rating === "fair"
      ? "9"
      : rating === "marginal"
      ? "11"
      : rating === "very vulnerable"
      ? "13"
      : rating === "under state supervision"
      ? "14"
      : rating === "in liquidation"
      ? "15"
      : "16"
  )
  await page.screenshot({ path: "ss02.png" })
  await Promise.all([
    page.click(".button-compare-now"),
    page.waitForNavigation({ waitUntil: "networkidle0" })
  ])
  await page.screenshot({ path: "ss1.png" })

  // --------------- the second page with the actual data -------------------------
  const offers = await page.$$eval(".subgrid.subgrid-5", blocks => {
    return blocks.map(block => {
      const title =
        block
          .querySelector(".text-element.text-company-name")
          ?.textContent?.trim() || "Undefined"
      const amBestRating =
        block
          .querySelector(".text-element.text-company-name")
          ?.textContent?.trim() || "Undefined"
      const term =
        block
          .querySelector(".text-element.text-result-list")
          ?.textContent?.trim() || "Undefined"
      const smoke =
        block
          .querySelector(".text-element.text-result-list-right-health")
          ?.textContent?.trim() || "Undefined"
      const priceSpans = Array.from(
        block.querySelectorAll(".text-text-mode-label")
      )
      let yearPrice = "Undefined"
      let monthPrice = "Undefined"
      for (const spanElement of priceSpans) {
        const span = spanElement
        const unit = span.querySelector(".text-text-47")?.textContent?.trim()
        const moUnit = span.querySelector(".text-text-51")?.textContent?.trim()
        const price = span.querySelector(".text-prem")?.textContent?.trim()
        if (unit === "/yr" && price) yearPrice = price
        if (moUnit === "/mo" && price) monthPrice = price
      }
      return {
        title,
        amBestRating,
        term,
        smoke,
        yearPrice,
        monthPrice
      }
    })
  })
  await page.screenshot({ path: "ss2.png" })
  console.log(offers)

  await browser.close()
  return { offers }
}

// POST /scrape API endpoint
app.post("/scrape", async (req, res) => {
  console.log(`[SCRAPE] Incoming request at /scrape`)
  try {
    console.log(`[SCRAPE] Request body:`, JSON.stringify(req.body, null, 2))

    if (!req.body || typeof req.body !== "object") {
      throw new Error("Invalid or missing JSON body")
    }

    const result = await scrape(req.body)

    console.log(
      `[SCRAPE] Scraping success. Offers found:`,
      result?.offers?.length || 0
    )
    res.json({ success: true, ...result })
  } catch (err) {
    console.error(`[SCRAPE] ERROR:`, err?.stack || err?.message || err)
    res.status(500).json({
      success: false,
      error: err.message || "Internal Server Error"
    })
  }
})

const port = 3000
app.listen(port, () => console.log(`Server listening on port ${port}`))
