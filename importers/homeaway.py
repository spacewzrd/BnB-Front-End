from .base import BaseImporter
import urllib.request
from bs4 import BeautifulSoup
from selenium import webdriver
import os

class HomeawayImporter(BaseImporter):
    example_url = "https://www.homeaway.com/vacation-rental/p223691"
    def raw_parse(self, url):
        listing_dict = {}

        driver = webdriver.PhantomJS(service_log_path=os.path.devnull)

        driver.get(url)

        html = driver.page_source

        soup = BeautifulSoup(html, 'html.parser')

        driver.quit()

        # # name
        name = soup.find("span", { "class" : "listing-headline-text" }).string.replace('\n', '')
        listing_dict['name'] = name

        # # address
        address = soup.find("a", {"class": "js-breadcrumbLink"}).string.replace('\n', '')
        listing_dict['X_address'] = address

        # # listing type -holds outerdiv for next 3 items
        listing_type_outer_div = soup.findAll("div", { "class" : "amenity-detail" })

        amenity_value_find_spec = ('div', { "class" : "amenity-value" })
        listing_dict['property_type'] = listing_type_outer_div[0].find(*amenity_value_find_spec).string
        listing_dict['num_guests']    = listing_type_outer_div[1].find(*amenity_value_find_spec).string
        listing_dict['num_bedrooms']  = listing_type_outer_div[2].find(*amenity_value_find_spec).string
        listing_dict['num_bathrooms'] = listing_type_outer_div[3].find(*amenity_value_find_spec).string
        listing_dict['X_min_stay']    = listing_type_outer_div[4].find(*amenity_value_find_spec).string

        # # main img homeaway loads pictures after
        # cover_photo = soup.find("div", { "class" : "prop-photos" }).div
        # listing_dict['photo'] = cover_photo

        # price
        listing_dict['base_price'] = soup.find("div", {"class": "price-large js-fromPriceValue"}).string

        # PHOTOS
        ulout = soup.find("div", {"class": "carousel-full-width-area js-carouselItems notransition"})
        alldiv = ulout.find_all('div')
        # create array
        photo_urls = []
        # loop through carousel div
        for div in alldiv:
            # find the image tag in the div
            img = div.find('img')
            # get the data-src
            ds = img.get('data-src')
            photo_urls.append(ds)
        # TO DO CHANGE THE SIZE OF THE PHOTOS BY CHANGING THE URL EX:
        # YOU GET -> <URL>.c4.jpg
        # CHANGE TO -> <URL>.c10.jpg


        return listing_dict
