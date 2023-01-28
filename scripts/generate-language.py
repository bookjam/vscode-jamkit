#!/usr/bin/env python3

import os
import sys

def _build_word_pattern():
    return '(' + '|'.join([
        r'[\\w-]+(@(verso|recto))?',     # property name & value
        r'\\$[A-Z_]+'                    # variable
    ]) + ')' 

def _read_file(filename):
    with open(filename, 'r') as file:
        return file.read()


def _write_file(filename, content):
    with open(filename, 'w') as file:
        file.write(content)


def _generate_language(lang):
    content = _read_file('templates/' + lang + '-configuration.template.json')
    content = content.replace('__WORD_PATTERN__', _build_word_pattern())
    _write_file(lang + '-configuration.json', content)


if __name__ == '__main__':
    _generate_language(sys.argv[1])
