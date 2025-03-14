import os
import json
from datetime import datetime

if not os.path.exists('market'):
    os.makedirs('market')

json_files = [f for f in os.listdir() if f.endswith('.json')]

for json_file in json_files:
    with open(json_file, 'r') as file:
        data = json.load(file)

    for script in data:
        if "color" in script:
            color_string = script["color"]
            color_list = [int(x) for x in color_string.split(",")]
            script["color"] = color_list

        if "variables" in script:
            new_variables = {}
            for variable in script["variables"]:
                language = variable["language"]
                if language == "English":
                    language = "ENG"
                elif language == "Spanish":
                    language = "SP"
                elif language == "German":
                    language = "GER"
                elif language == "French":
                    language = "FR"
                elif language == "Italian":
                    language = "IT"
                elif language == "Korean":
                    language = "KOR"
                elif language == "Japanese rev5":
                    language = "JP5"
                elif language == "Japanese rev6":
                    language = "JP6"
                else:
                    language = "default"

                new_variable = new_variables.get(variable["name"],
                                            {
                                            "name": variable["name"],
                                            "default": "",
                                            "overrulingValues": {
                                                "ENG": "",
                                                "SP": "",
                                                "GER": "",
                                                "FR": "",
                                                "IT": "",
                                                "KOR": "",
                                                "JP5": "",
                                                "JP6": ""
                                            }})
                if language == "default":
                    new_variable["default"] = variable["value"]
                else:
                    new_variable["overrulingValues"][language] = variable["value"]

                new_variables.update({variable["name"]: new_variable})
            script["variables"] = list(new_variables.values())

        if "code" in script:
            new_code = []
            for command in script["code"]:
                if command["type"] == "command":
                    new_command = {
                        "type": "command",
                        "name": command["name"],
                        "parameters": [
                            {
                                "name": param["name"],
                                "size": "u8" if param["type"] == "text" else param["size"],
                                "value": param["value"]
                            } for param in command["parameters"]
                        ]
                    }
                    new_code.append(new_command)
                elif command["type"] == "memory_editor":
                    new_command = {
                        "type": "memory_editor",
                        "size": hex(len(command["memory"])),
                        "memory": command["memory"]
                    }
                    new_code.append(new_command)
                elif command["type"] == "assembly":
                    new_command = {
                        "type": "assembly",
                        "assembly": command["assembly"]
                    }
                    new_code.append(new_command)
            script["code"] = new_code

    title = json_file.replace('_', ' ').replace('.json', '').title()

    supported = []
    if 'diamond' in json_file.lower():
        supported.append('diamond')
    if 'pearl' in json_file.lower():
        supported.append('pearl')
    if 'platinum' in json_file.lower():
        supported.append('platinum')
    if not any(x in json_file.lower() for x in ['diamond', 'pearl', 'platinum']):
        supported.extend(['diamond', 'pearl'])

    file_creation_date = datetime.utcfromtimestamp(os.path.getmtime(json_file))
    formatted_date = file_creation_date.strftime('%b. %d %Y')

    new_data = {
        'title': title,
        'description': '',
        'author': 'RETIRE',
        'supported': supported,
        'scripts': data
    }

    output_path = os.path.join('market', json_file)

    with open(output_path, 'w') as output_file:
        json.dump(new_data, output_file, indent=4)

    print(f"Saved: {output_path}")
