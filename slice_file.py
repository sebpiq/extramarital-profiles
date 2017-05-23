import os
import sys
import csv
import json

if len(sys.argv) < 2:
    print('usage : python %s <slices_dir>' % sys.argv[0])
    sys.exit(1)
slices_dir = sys.argv[1]

file_path = 'data/am_am.csv'
rows_per_slice = 3000
headers = [
    'id',
    'createdon',
    'createdby',
    'updatedon',
    'updatedby',
    'admin',
    'status',
    'account_type',
    'membership_status',
    'ad_source',
    'profile_number',
    'nickname',
    'first_name',
    'last_name',
    'street1',
    'street2',
    'city',
    'zip',
    'state',
    'latitude',
    'longitude',
    'country',
    'phone',
    'work_phone',
    'mobile_phone',
    'gender',
    'dob',
    'profile_caption',
    'profile_ethnicity',
    'profile_weight',
    'profile_height',
    'profile_bodytype',
    'profile_smoke',
    'profile_drink',
    'profile_initially_seeking',
    'profile_relationship',
    'pref_opento',
    'pref_opento_other',
    'pref_opento_abstract',
    'pref_turnsmeon',
    'pref_turnsmeon_other',
    'pref_turnsmeon_abstract',
    'pref_lookingfor',
    'pref_lookingfor_other',
    'pref_lookingfor_abstract',
    'main_photo',
    'security_question',
    'security_answer'
]

filter_headers = [
    'createdon', #: 2002-10-25 23:27:21
    'nickname', # Lippy4u
    'first_name', # Christope R
    'last_name', # Ashley
    'gender', # 2
    'dob', # 1972-03-13
    'profile_caption',
    'pref_opento_abstract',
    'pref_turnsmeon_abstract',
    'pref_lookingfor_abstract',
]

filter_indices = [ headers.index(f) for f in filter_headers ]

# metadata : [<filename>, <rowStart>, <rowEnd>]
slices_metadata = []
slices_count = 0
row_count = 0
with open(file_path) as csvfile:
    csv_reader = csv.reader(csvfile)
    has_data = True

    while has_data:
        slice_filename = '%s.json' % slices_count
        slice_metadata = [ slice_filename, row_count ]
        slice_file_path = os.path.join(slices_dir, slice_filename)
        rows_slice = []

        print('writing slice %s' % slice_file_path)
        for i in range(rows_per_slice):
            row = next(csv_reader, None)
            if row is None:
                has_data = False
                break
            if len(row) < len(headers):
                print('freak row')
                continue

            row_count += 1
            row = [ row[i] for i in filter_indices ]
            rows_slice.append(row)

        with open(slice_file_path, 'w') as fd:
            fd.write(json.dumps(rows_slice))

        slice_metadata.append(row_count)
        slices_metadata.append(slice_metadata)
        slices_count += 1

with open('slices_metadata.json', 'w') as fd:
    fd.write(json.dumps(slices_metadata))

print('DONE!')
