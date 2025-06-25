import express from "express";
import puppeteer from "puppeteer";

const app = express();
app.use(express.json());

async function scrape({ zip, birthdate, gender, smoke, health, term, amount, rating }) {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  await page.goto('https://www.term4sale.ca/');
  await page.type("#zipcode", zip);
  await page.select('select[name="BirthMonth"]', String(birthdate.getMonth() + 1));
  await page.select('select[name="BirthDay"]', String(birthdate.getDate()));
  await page.select('select[name="BirthYear"]', String(birthdate.getFullYear()));
  
  // Gender selection
  await page.evaluate((gender) => {
    const input = document.querySelector(gender === 'male' ? 'input[value="M"]' : 'input[value="F"]');
    if (input) input.click();
  }, gender);

  // Smoke selection
  await page.evaluate((smoke) => {
    const input = document.querySelector(smoke ? 'input[value="Y"]' : 'input[value="N"]');
    if (input) input.click();
  }, smoke);

  // Health select
  const healthMap = {
    exceptional: 'PP',
    excellent: 'P',
    'above average': 'RP',
    average: 'R'
  };
  await page.select('select[name="Health"]', healthMap[health]);

  // Term select simplified (oml the mapping for this sucks)
  const termMap = {
    '10 yr': '3',
    '15 yr': '4',
    '20 yr': '5',
    '25 yr': '6',
    '30 yr': '7',
    '35 yr': '9',
    '40 yr': '0',
    'to 65': 'A',
    'to 70': 'B',
    'to 75': 'C',
    'to 100': 'P',
    other: 'F'
  };
  await page.select('select[name="NewCategory"]', termMap[term] || 'F');

  // Amount select
  await page.select('select[name="FaceAmount"]', amount);

  // Rating select
  const ratingMap = {
    superior: '1',
    excellent: '3',
    'very good': '5',
    adequate: '7',
    fair: '9',
    marginal: '11',
    'very vulnerable': '13',
    'under state supervision': '14',
    'in liquidation': '15',
    'best ratings': '16'
  };
  await page.select('select[name="CompRating"]', ratingMap[rating] || '16');

  await Promise.all([
    page.click('.button-compare-now'),
    page.waitForNavigation({ waitUntil: 'networkidle0' })
  ]);

  const offers = await page.$$eval('.subgrid.subgrid-5', (blocks) => {
    return blocks.map(block => {
      const title = block.querySelector('.text-element.text-company-name')?.textContent?.trim() || 'Undefined';
      const amBestRating = block.querySelector('.text-element.text-company-name')?.textContent?.trim() || 'Undefined';
      const term = block.querySelector('.text-element.text-result-list')?.textContent?.trim() || 'Undefined';
      const smoke = block.querySelector('.text-element.text-result-list-right-health')?.textContent?.trim() || 'Undefined';
      const priceSpans = Array.from(block.querySelectorAll('.text-text-mode-label'));
      let yearPrice = 'Undefined';
      let monthPrice = 'Undefined';
      for (const span of priceSpans) {
        const unit = span.querySelector('.text-text-47')?.textContent?.trim();
        const moUnit = span.querySelector('.text-text-51')?.textContent?.trim();
        const price = span.querySelector('.text-prem')?.textContent?.trim();
        if (unit === '/yr' && price) yearPrice = price;
        if (moUnit === '/mo' && price) monthPrice = price;
      }
      return {
        title,
        amBestRating,
        term,
        smoke,
        yearPrice,
        monthPrice
      };
    });
  });

  await browser.close();
  return offers;
}

// POST /scrape API endpoint
app.post("/scrape", async (req, res) => {
  try {
    const result = await scrape(req.body);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to scrape data" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on port ${port}`));
