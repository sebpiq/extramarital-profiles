# Extracting and processing the data

1. Get the mysql dump from bittorrent, find the dump file containing users bios, and generate a CSV file from it :

```
python mysqldump_to_csv.py data.dump
```

2. Slice the csv file and generate an index :

```
python slice_file.py data.csv
```

# Starting the web app

The app is then just a static html / js app and can be found in `docs/`