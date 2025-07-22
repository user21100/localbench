import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import os

# Use the absolute file URL provided by the user
FILE_URL = 'file:///Users/djinsad/Desktop/localbench/benchtool/sentencing.html'

# Test queries
QUERIES = [
    'assault',
    'conspiracy',
    'driving',
    'solicitation',
    'felony',
    'misdemeanor',
    'PL 120.05',
    'PL 100.00',
    'vehicular',
    'burglary'
]

# Set up Chrome options
chrome_options = Options()
chrome_options.add_argument('--disable-gpu')
chrome_options.add_argument('--no-sandbox')
chrome_options.add_argument('--allow-file-access-from-files')

# Start WebDriver
driver = webdriver.Chrome(options=chrome_options)
driver.get(FILE_URL)

try:
    search_input = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.ID, 'offenseSearchInput'))
    )
    results_container = driver.find_element(By.ID, 'offenseSearchResults')

    for query in QUERIES:
        search_input.clear()
        search_input.send_keys(query)
        time.sleep(0.7)  # Wait for debounce and results to appear
        # Results may be hidden if no results
        results = results_container.find_elements(By.CLASS_NAME, 'search-result-item')
        print(f"Query: '{query}' - Results: {len(results)}")
        if results:
            print(f"  First result: {results[0].text.strip()}")
        else:
            print("  No results found.")
        time.sleep(0.5)
finally:
    driver.quit() 