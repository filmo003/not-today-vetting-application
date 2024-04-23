# not-today-vetting-application
Vetting application for the SLD 45 Data Derby


# Example data
Front barcode:
```plain
M1E46E0B01I1UJGGGeoffrey            SWelch                     B41TUS ED00      ZZNSZBD0CBE2ATPEAH4
```

Parsed:
```plain
version: M
DOD_ID: 1547909131
UNKNOWN: 01I1UJGG
first_name: Geoffrey
m_initial: S
last_name: Welch
UNKNOWN: B41TUS ED00      ZZNSZBD0CBE2A
CSID: 999762468

```

Back barcode:
```plain
1TPEAH4X1E46E0BEDZ
```

Parsed:
```plain
version: 1
CSID: 999762468
person_type: X
DOD_ID: 1547909131
person_category: E
branch: D
card_id: Z

```

# Frontend
`/frontend` contains the web frontend.
It is a single form with one text input element. When the user scans a barcode, it is typed into the field.

Once the backend is stood up, the DOD ID can be sent to the backend and either validated or rejected. The entire UX is one button, and the UI turning green or red based.

## Deployment
`docker compose up dev-web` deploys the frontend.

To run it on the scanner, either connect it to a network and open chrome and point it to the IP of the deployment, or connect it via USB-C and open the app through chrome remote debugging.
