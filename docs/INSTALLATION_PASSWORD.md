# Instalační Heslo - Neresetovatelné Bezpečnostní Design

## 🔒 Klíčový Koncept

Každá Raspberry Pi instalace má **JEDNO instalační heslo**, které se generuje při **první registraci** a **NEMŮŽE se resetovat**.

```
Raspberry Pi #1 → Jedno instalační heslo (například: K7x#mP2$vN9@qL4&bE8*)
```

## 🚀 Jak to Funguje

### 1️⃣ První Registrace
- Uživatel se zaregistruje
- Systém **automaticky generuje** 20-znakové heslo
- Heslo se **jedenkrát** zobrazí na obrazovce s **VELKÝM VAROVÁNÍM**
- Uživatel si heslo **musí zkopírovat a uložit**

### 2️⃣ Přihlašování Dalších Uživatelů
- Nový uživatel se zaregistruje
- Je vyzván zadat instalační heslo (ze první registrace)
- Po ověření může vytvořit svůj vlastní účet

### 3️⃣ Přihlášení
- Každý uživatel se musí přihlásit s:
  - ✅ Instalačním heslem (sdílené)
  - ✅ Svým e-mailem
  - ✅ Svým účtovým heslem (osobní)

## ❌ Proč Se Heslo NEDÁ Resetovat

### Bezpečnostní Důvody
1. **Jediný klíč k systému** - Heslo je poslední obrana proti neoprávněnému přístupu
2. **Záměrný design** - Uživatelé si musí pamatovat JEDNO heslo
3. **Jednoduchost** - Žádné složité procesy obnovy hesel
4. **Ochrana před kompromitací** - Pokud by někdo měl přístup k backendu, nemůže heslo resetovat

### Praktické Důvody
1. Na jednom Raspberry je JEDNO heslo pro VŠECHNY uživatele
2. Není "správce hesel" - každý si musí pamatovat nebo zapsat
3. Eliminuje riziko sociálního inženýrství ("zapomněl jsem heslo")
4. Zjednodušuje implementaci - žádná email obnova, žádné resetovací linky

## 📝 Co Dělat, Když Ztratíte Heslo

### ⚠️ Pokud Ztratíte Instalační Heslo
**Budete se NEMOCI přihlásit - neexistuje obnova!**

Možnosti:
1. **Lepší zdrojová kontrola**: Napište si heslo na papír
2. **Správce hesel**: Uložte do 1Password, Bitwarden, atd.
3. **Sdílení v týmu**: Uložte na sdílené místo v týmu
4. **Resetování instalace**: Smazat `/backend/src` data a spustit znovu (ztratí se všechny účty!)

### Řešení v Krizové Situaci
```bash
# Zastavit všechny služby
docker compose down

# Smazat všechna data uživatelů (POZOR - nevratné!)
# Heslo se vygeneruje znovu při příští první registraci
rm -rf backend/data/users.json

# Restartovat
docker compose up -d
```

## 🎯 Best Practices

### ✅ Doporučené Postupy
- [ ] Heslo si napište při první registraci
- [ ] Uložte si ho na bezpečné místo
- [ ] Podělte se s ohleduplnými členy týmu
- [ ] Nechte ho v správci hesel
- [ ] Tiskněte si ho v dokumentaci instalace

### ❌ Nedělejte
- ❌ Nesdělujte si heslo bez kontroly
- ❌ Neukládejte ho v e-mailu nebo chatu
- ❌ Nepsaně se na to nespolehejte
- ❌ Nepředpokládejte, že se dá resetovat

## 🔐 Technické Detaily

### Générování Hesla
```typescript
function generateRandomPassword(): string {
  // 20 znaků: A-Z, a-z, 0-9, !@#$%^&*_+-=
  // Náhodné pořadí
  // Zaručí alespoň 1 velké písmeno, 1 malé, 1 číslo, 1 speciální znak
}
```

### Ověřování
```typescript
export function verifyPassword(providedPassword: string): boolean {
  // Porovnává s uloženým heslem
  // Max 10 pokusů za 15 minut (ochranu před brute-force)
  // Bez obnovení - heslo je to, co je
}
```

### Uložení
- V paměti serveru během běhu (dev)
- V databázi (produkce - datbase.ts)
- Nikdy se neposílá do frontendu (kromě při vytvoření)

## 📞 FAQ

**Q: Co když zapomenu heslo?**
A: Nebudete se moct přihlásit. Resetujte instalaci (ztratíte všechny účty).

**Q: Můžu si vymluvit nové heslo?**
A: Ne. Heslo se nemůže resetovat - je to záměrný design.

**Q: Jak mám heslo bezpečně sdílet?**
A: Osobně, telefonem, nebo správcem hesel - nikdy e-mailem.

**Q: Co když znode, kterou instalaci je heslo?**
A: Dokumentujte své instalace - hesla jsou unikátní pro každou Raspi.

**Q: Změní se heslo, když restartuju server?**
A: Ne. Heslo je trvalé (v databázi v produkci, v paměti v dev).

## 🚀 Budoucí Vylepšení

- [ ] QR kód pro heslo (sdílení bez opsání)
- [ ] Šifrování hesla v databázi (víceúrovňové bezpečí)
- [ ] Auditing pokusů o přihlášení
- [ ] Rate limiting na základě IP adresy
- [ ] Integrace s TOTP (dvoustupňová autentifikace)

---

**Posledně aktualizováno**: Březen 2026  
**Verze**: 1.0.0
