import os
import requests
import time

def ping_url(url, max_trials, delay):
  trials = 0

  while trials < max_trials:
    try:
      response = requests.get(url)
      if response.status_code == 200:
          print(f"URL {url} is reachable")
          return True
    except requests.ConnectionError:
      print(f"Website {url} is unreachable. Retrying in {delay} seconds...")
      time.sleep(delay)
      trials += 1
    except requests.exceptions.MissingSchema:
      print(f"Invalid URL format: {url}")
      return False
  return False

def run():
  website_url = os.getenv("INPUT_URL")
  max_trials = int(os.getenv("INPUT_MAX_TRIALS"))
  delay = int(os.getenv("INPUT_DELAY"))

  website_reachable = ping_url(website_url, max_trials, delay)

  if not website_reachable:
    raise Exception(f"Website {website_url} is malformed or unreachable")

  print(f"Website {website_url} is reachable")

if __name__ == "__main__":
  run()
