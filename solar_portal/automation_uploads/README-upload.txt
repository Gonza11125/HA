Soubory pro upload do Solar Portalu (sekce Automatizace):

1) automatizace-kotel-import.json
   - Doporuceny soubor pro import do portalu.
   - Obsahuje 2 zaznamy automatizace.

2) ha-kotel-levny-tarif.yaml
   - YAML varianta (muze se nahrat take).
   - Pozn.: Portal z YAML nacte hlavne nazev souboru a enabled stav.

3) automatizace-kotel-plna-logika.json
   - Rozsirena verze podle screenshot logiky (SOC, casove okno, teplota, rucni blokace).

4) ha-kotel-plna-logika.yaml
   - Home Assistant YAML automatizace se stejnou plnou logikou.
   - Zkontroluj entitu input_boolean.rucne_vypnout_automatizaci_kotle a pripadne ji uprav.

Jak nahrat:
- Otevri Solar Portal -> Dashboard -> Automatizace
- Klikni Nahrat automatizaci
- Vyber JSON nebo YAML soubor z teto slozky

Cesta:
solar_portal/automation_uploads/
