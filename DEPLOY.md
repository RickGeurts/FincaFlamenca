# Deploying Finca Flamenca on Railway

One Railway service serves both the app and the sync API, so there is no CORS
setup and only one thing to keep running.

## Eerste keer

1. **Maak het project.** Op [railway.app](https://railway.app): *New Project* →
   *Deploy from GitHub repo* (of `railway init` + `railway up` vanuit deze map
   als je geen repo hebt).

2. **Voeg Postgres toe.** In het project: *New* → *Database* → *Add PostgreSQL*.
   Railway zet dan automatisch `DATABASE_URL` klaar.

3. **Koppel de variabele aan de app.** Open de app-service → *Variables* →
   *Add Reference* → kies `DATABASE_URL` van de Postgres-service.

   Zonder die variabele start de app gewoon op, maar staat syncen uit
   (`/api/health` geeft dan `"sync": false`). Het spel blijft speelbaar.

4. **Deploy.** Railway leest `railway.json`: het draait `npm run build` en
   daarna `npm start`. De health check op `/api/health` moet groen worden.

5. **Zet een domein aan.** App-service → *Settings* → *Networking* →
   *Generate Domain*.

## Controleren of het werkt

```bash
curl https://<jouw-domein>/api/health
# {"ok":true,"sync":true}   <- sync:true betekent dat de database er is
```

Daarna in de app: tabblad **Lecciones** → *Guardar en la nube* → **Activar**.
Je krijgt een code van twaalf tekens. Tik die op een tweede toestel in via
*Ya tengo un código* en beide toestellen delen dezelfde boerderij.

## Wat er opgeslagen wordt

Eén rij per boerderij in de tabel `farms`:

| kolom        | inhoud                                              |
| ------------ | --------------------------------------------------- |
| `code`       | de koppelcode — dit is de hele identiteit            |
| `save`       | de savegame als JSON                                 |
| `saved_at`   | wanneer die kopie in de app is opgeslagen            |
| `email`      | optioneel, alleen om de code terug te vinden         |
| `created_at` | wanneer de boerderij is aangemaakt                   |

Geen wachtwoorden, geen sessies, geen analytics.

## Hoe conflicten aflopen

De server accepteert alleen een kopie die minstens even nieuw is als wat er
staat. Een ouder toestel dat wakker wordt krijgt `409` met de nieuwere kopie
terug, en de app neemt die over. Zo kan een telefoon die een week uit heeft
gestaan de voortgang van gisteren niet overschrijven.

## Kosten

Railway rekent per gebruik. Voor één speler is dit een paar cent per maand aan
Postgres plus een container die vrijwel niets doet, maar het is geen gratis
plan: houd het in de gaten als je Railway verder niet gebruikt.

## Lokaal draaien met een database

```bash
npm run build
DATABASE_URL=postgres://user:pass@localhost:5432/finca PGSSL=off npm start
```

`PGSSL=off` is nodig voor een lokale Postgres zonder TLS; op Railway laat je
die weg.
