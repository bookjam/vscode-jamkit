#!/usr/bin/env python3

import os
import sys


def _read_file(filename):
    with open(filename, 'r') as file:
        return file.read()


def _write_file(filename, content):
    with open(filename, 'w') as file:
        file.write(content)


def _generate_language(lang):
    content = _read_file(lang + '-configuration.template.json')
    content = content.replace('"__WORD_PATTERN__"', r'"([\\w-]+(@(verso|recto))?)|(\\$[A-Z_]+)"')
    _write_file('languages/' + lang + '-configuration.json', content)


if __name__ == '__main__':
    if not os.path.exists('languages'):
        os.makedirs('languages')
    _generate_language(sys.argv[1])
