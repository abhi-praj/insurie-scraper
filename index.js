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
  birthdate,
  gender,
  smoke,
  health,
  term,
  amount,
  rating,
}) {
  let browser;
  try {
    birthdate = new Date(birthdate)
    smoke = smoke === "true" || smoke === true
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    const page = await browser.newPage()
    await page.goto("https://www.term4sale.ca/")
    // await page.screenshot({ path: "ss0.png" })
    // ------- page for where data is inputed ---------
    await page.type("#zipcode", "L4T 0B1")
    await page.select(
      'select[name="BirthMonth"]',
      String(birthdate.getMonth() + 1)
    )
    await page.select('select[name="BirthDay"]', String(birthdate.getDate()))
    await page.select('select[name="BirthYear"]', String(birthdate.getFullYear()))
    // await page.screenshot({ path: "ss01.png" })
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
    // await page.screenshot({ path: "ss02.png" })
    await Promise.all([
      page.click(".button-compare-now"),
      page.waitForNavigation({ waitUntil: "networkidle0" })
    ])
    // await page.screenshot({ path: "ss1.png" })

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
          // amBestRating,
          term,
          smoke,
          yearPrice,
          monthPrice
        }
      })
    })
    // await page.screenshot({ path: "ss2.png" })
    console.log(offers)

    await browser.close()
    
    // Return structured response
    return { 
      success: true, 
      offers: offers || []
    }
  } catch (error) {
    console.error('Scraping error in scrape():', error)
    if (browser) {
      try {
        await browser.close()
      } catch (closeError) {
        console.error('Error closing browser:', closeError)
      }
    }
    return { 
      success: false, 
      error: error.message || "Scraping failed", 
      offers: [] 
    }
  }
}

async function scrape2({
  birthdate,
  gender,
  smoke,
  amount,
  term,
  name="Riley",
  number="9054691234",
}) {
  let browser;
  try {
    birthdate = new Date(birthdate)
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    const page = await browser.newPage();
    await page.goto("https://thetermguy.ca/");
    
    if (gender === 'male') {
      await page.waitForSelector('label[for="male"]');
      await page.click('label[for="male"]');
    } else {
      await page.waitForSelector('label[for="female"]');
      await page.click('label[for="female"]');
    }
    
    if (smoke === "true" || smoke === true) {
      await page.waitForSelector('label[for="Yes"]');
      await page.click('label[for="Yes"]')
    } else {
      await page.waitForSelector('label[for="No"]');
      await page.click('label[for="No"]')
    }
    
    const selects = await page.$$('select.form-select');
    await selects[0].select(term.split(' ')[0]);
    await selects[1].select(amount);
    
    await page.select('select[name="mauticform[dob_month]"]', '02')
    await page.select('select[name="mauticform[dob_day]"]', '31')
    await page.select('select[name="mauticform[dob_year]"]', String(birthdate.getFullYear()))
    
    await page.type('input[name="mauticform[firstname]"]', name)
    await page.type('input[name="mauticform[phone]"]', number)
    
    // await page.click('button[type="submit"]')
    await page.screenshot({ path: "ss0124.png" });
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: "networkidle0" })
    ])
    // await page.screenshot({ path: "ss0125.png", fullPage: true });

    // ------------------ RESULTS -----------------------------
    const offers = await page.$$eval('div[id$="empire-life-results"]', (blocks, term, smoke) => {
      return blocks.map((block) => {
        const imgElem = block.querySelector('img.img-fluid.quote-results-logo')
        const provider = imgElem ? imgElem.src.split('/').pop().split('.')[0] : null
        // const renewable = block.querySelector('.quote-results-renewable')?.textContent?.trim() || null
        // const convertible = block.querySelector('.quote-results-convertible')?.textContent?.trim() || null
        // const exchange = block.querySelector('.quote-results-exchange')?.textContent?.trim() || null
        // const adb = block.querySelector('.quote-results-adb')?.textContent?.trim() || null
        const monthly_price = block.querySelector('.quote-results-premium')?.textContent?.trim() || null
        const annual_plan = block.querySelector('.quote-results-premium-pd-annually')?.textContent?.trim() || null
        return {
          title: provider,
          term: term,
          smoke: smoke,
          yearPrice: annual_plan ? String(Number(annual_plan.replace(/[^0-9.]/g, '')) * 12) : null,
          monthPrice: monthly_price,
          // renewable,
          // convertible,
          // exchange,
          // adb,
        }
      })
    })
    
    // await page.screenshot({ path: "ss.png", fullPage: true })
    console.log(offers);
    await browser.close()
    console.log('done')
    
    // Return structured response
    return { 
      success: true, 
      offers: offers || []
    }
  } catch (error) {
    console.error('Scraping error in scrape2():', error)
    if (browser) {
      try {
        await browser.close()
      } catch (closeError) {
        console.error('Error closing browser:', closeError)
      }
    }
    return { 
      success: false, 
      error: error.message || "Scraping failed", 
      offers: [] 
    }
  }
}

// POST /scrape API endpoint
app.post("/scrape", async (req, res) => {
  console.log(`[SCRAPE] Incoming request at /scrape`)
  try {
    console.log(`[SCRAPE] Request body:`, JSON.stringify(req.body, null, 2))

    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({
        success: false,
        error: "Invalid or missing JSON body",
        offers: []
      })
    }

    const result = await scrape(req.body)

    console.log(
      `[SCRAPE] Scraping result:`,
      `Success: ${result.success}, Offers: ${result?.offers?.length || 0}`
    )
    
    // Return the result directly (it already has success/error structure)
    res.json(result)
  } catch (err) {
    console.error(`[SCRAPE] ERROR:`, err?.stack || err?.message || err)
    res.status(500).json({
      success: false,
      error: err.message || "Internal Server Error",
      offers: []
    })
  }
})

app.post("/scrape2", async (req, res) => {
  console.log(`[SCRAPE2] Incoming request at /scrape2`)
  try {
    console.log(`[SCRAPE2] Request body:`, JSON.stringify(req.body, null, 2))
    
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({
        success: false,
        error: "Invalid or missing JSON body",
        offers: []
      })
    }
    
    const result = await scrape2(req.body)
    console.log(
      `[SCRAPE2] Scraping result:`,
      `Success: ${result.success}, Offers: ${result?.offers?.length || 0}`
    )
    
    // Return the result directly (it already has success/error structure)
    res.json(result)
  } catch (err) {
    console.error(`[SCRAPE2] ERROR:`, err?.stack || err?.message || err)
    res.status(500).json({
      success: false,
      error: err.message || "Internal Server Error",
      offers: []
    })
  }
})

const port = 3000
app.listen(port, () => console.log(`Server listening on port ${port}`))
