from .base import BaseImporter
import urllib.request
from bs4 import BeautifulSoup
import json

class AirbnbImporter(BaseImporter):
    example_url = "http://airbnb.com/rooms/8644874"

    def raw_parse(self, url):
        listing_dict = {}

        line_config = {
            'checkin_time_min' : 'Check In:',
            'checkout_time' : 'Check Out:',
            # 'num_guests' : 'Accommodates:',
            'num_bathrooms' : 'Bathrooms:',
            'num_bedrooms' : 'Bedrooms:',
            'property_type' : 'Property type:',
            'weekend_price' : 'Weekend Price:',
        }

        resp = self.get_contents_from_url(url)

        soup = BeautifulSoup(resp.text, 'html.parser')

        # name
        listing_dict['name'] = soup.find(id="listing_name").string

        lines = soup.find(id='details').get_text('\n').split('\n')
        lines = [l.strip() for l in lines]
        lines = [l for l in lines if len(l)]
        for idx, line in enumerate(lines):
            for key, val in line_config.items():
                if val in line:
                    listing_dict[key] = lines[idx+1]

        # address
        listing_dict['X_address'] = soup.find("div", {"id": "display-address"}).a.string

        # listing type -holds outerdiv for next 3 items
        listing_type_outer_div = soup.findAll("div", { "class" : "row row-condensed text-muted text-center" })
        # print(listing_type_outer_div)

        listing_dict['property_type'] = listing_type_outer_div[1].div.string
        listing_dict['num_guests'] = listing_type_outer_div[1].div.next_sibling.string
        listing_dict['num_bedrooms'] = listing_type_outer_div[1].div.next_sibling.next_sibling.string

        # beds
        listing_dict['X_bed'] = listing_type_outer_div[1].div.next_sibling.next_sibling.next_sibling.string

        # main img
        listing_dict['photos'] = [soup.find("span", { "class" : "cover-photo" }).img['src']]
        # listing_dict['photos'] = []

        # price
        listing_dict['base_price'] = soup.find("span", {"id": "book-it-price-string"}).span.span.string

        # import photos, for now can you populate this array. I'll take it from here

        MetaContent = soup.find("meta", {"id": "_bootstrap-room_options"})
        content = MetaContent["content"]
        parsed_json = json.loads(content)
        photosArray = parsed_json['photoData']

        photo_urls = []

        for photo in photosArray:
            cap = photo['url']
            photo_urls.append(cap)
            

        return listing_dict
