import os
import json
from datetime import datetime

if not os.path.exists('temp'):
    os.makedirs('temp')

json_files = [f for f in os.listdir() if f.endswith('.json')]

for json_file in json_files:
    with open(json_file, 'r') as file:
        data = json.load(file)

    # Modify the "color" field for all dictionaries in the "scripts" list
    for script in data:
        if "color" in script:
            # Convert the color string to a list of integers
            color_string = script["color"]
            color_list = [int(x) for x in color_string.split(",")]
            script["color"] = color_list

    # Set the title by removing underscores and capitalizing
    title = json_file.replace('_', ' ').replace('.json', '').title()

    # Determine the supported categories based on the json file name
    supported = []
    if 'diamond' in json_file.lower():
        supported.append('diamond')
    if 'pearl' in json_file.lower():
        supported.append('pearl')
    if 'platinum' in json_file.lower():
        supported.append('platinum')
    if not any(x in json_file.lower() for x in ['diamond', 'pearl', 'platinum']):
        supported.extend(['diamond', 'pearl'])

    # Get the creation date of the file
    file_creation_date = datetime.utcfromtimestamp(os.path.getmtime(json_file))
    formatted_date = file_creation_date.strftime('%b. %d %Y')

    # Prepare the new structure for the JSON data
    new_data = {
        'title': title,
        'supported': supported,
        'author': 'RETIRE',
        'date': formatted_date,
        'scripts': data
    }

    # Save the new JSON data to the 'temp' directory
    output_path = os.path.join('temp', json_file)

    with open(output_path, 'w') as output_file:
        json.dump(new_data, output_file, indent=4)

    print(f"Saved: {output_path}")
