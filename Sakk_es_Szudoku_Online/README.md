# Sakk és Szudoku Online 🎮

Egy modern, asztali és mobilbarát webes játékplatform, amely tartalmazza a **Sakkot** és a **Szudokut** egyetlen letisztult felületen. Játszható egyedül (AI robot ellen), helyi 2 játékos módban, vagy **valós idejű online többjátékos** módban a barátokkal!

---

## 🚀 Hogyan indítsd el a játékot?

### 1. módszer: Gyorsindítás (Ajánlott)
Kattints duplán az **`inditas.bat`** fájlra a mappában!
- Ez elindítja a helyi Python szervert, és automatikusan megnyitja a játékot az alapértelmezett böngésződben.
- A terminálban megjelenik a helyi Wi-Fi hálózati IP-címed is (pl. `http://192.168.1.15:8000`), amit beírhatsz telefonon vagy tableten is, ha azonos Wi-Fi-re csatlakozol!

### 2. módszer: Közvetlen megnyitás
Egyszerűen nyisd meg az **`index.html`** fájlt bármelyik modern böngészőben (Chrome, Edge, Firefox, Safari).

---

## ♟️ Sakk funkciók

- **Teljes szabályrendszer**:
  - Hivatalos bábulépések
  - Kis sánc (O-O) és nagy sánc (O-O-O)
  - En passant (menet közbeni ütés)
  - Gyalogátváltozás (Promóció: Vezér, Bástya, Futó, Huszár)
  - Sakk, sakk-matt és döntetlen (patt, 50 lépéses szabály, elégtelen készlet) automatikus észlelése
- **Játékmódok**:
  - **Számítógép ellen (AI)**: 3 nehézségi szint (Kezdő, Haladó, Mester szintű Minimax algoritmus Alpha-Beta nyeséssel és pozíciós táblákkal).
  - **Helyi 2 játékos**: Egy képernyőn és billentyűzeten játszható egymás ellen.
  - **Online Többjátékos**: Szobakóddal vagy megosztható linkkel. Valós idejű lépésszinkronizáció, sakkóra (3p, 5p, 10p vagy időkorlát nélkül), feladás, és mérkőzés közbeni csevegő.
- **Vizuális elemek**:
  - Éles, méretezhető vektoros (SVG) bábuk
  - Lépéslehetőségek és ütések megjelölése
  - Legutóbbi lépés kiemelése
  - Sakkban lévő király pulzáló piros jelzése
  - Leütött bábuk és algebrai lépéselőzmények listája
  - Tábla megfordításának lehetősége

---

## 🔢 Szudoku funkciók

- **Generátor és Ellenőrző**:
  - Garantáltan egyedi és érvényes megoldással rendelkező 9x9-es feladványok
  - 4 nehézségi szint: **Könnyű**, **Közepes**, **Nehéz**, **Mester**
  - Valós idejű ütközés- és hibakereső (duplikációk piros kiemelése)
- **Kényelmi eszközök**:
  - **Ceruzajegyzet (Pencil Notes)**: Bármelyik üres mezőbe beírhatsz lehetséges jelölteket (3x3 kis rácsként jelenik meg).
  - **Számkiemelés**: Egy számra kattintva a tábla összes azonos száma kivilágosodik.
  - **Összefüggő mezők kiemelése**: Az aktív cella sora, oszlopa és 3x3-as blokkja lágyan megvilágításra kerül.
  - **Visszavonás (Undo)** és **Segítség (Hint)** gombok.
  - Numerikus billentyűzet és fizikai billentyűzet (1-9, Backspace, nyílbillentyűk) támogatása.
- **Online Módok**:
  - **Párbaj / Verseny (Race)**: Mindkét játékos ugyanazt a feladványt kapja. A képernyő tetején valós idejű haladási sáv mutatja, hány mezőt fejtett meg sikeresen az ellenfél. Az nyer, aki elsőként kész!
  - **Kooperatív (Együttfejtés)**: Két játékos valós időben közösen oldja meg ugyanazt a táblát. Látjátok egymás kurzorát, beírt számait és jegyzeteit!

---

## 🌐 Hogyan játszhattok Online a barátoddal?

1. Nyisd meg a játékot, majd kattints az **„Online Szoba Készítése”** vagy az **„Online Párbaj & Kooperáció”** gombra!
2. Állítsd be a kívánt opciókat (szín, idő vagy szudoku játékmód), majd nyomj a **„Szoba Létrehozása”** gombra!
3. Megjelenik egy **6 jegyű szobakód** (pl. `AB12CD`) és egy közvetlen link.
4. **Oszd meg a kódot vagy a linket a barátoddal**:
   - Ha a linkre kattint, automatikusan csatlakozik a szobádhoz.
   - Vagy a főmenüben a „Kaptál egy szobakódot?” mezőbe írja be a kódot!
5. A WebRTC technológiának (PeerJS) köszönhetően a kapcsolat közvetlenül a két böngésző között jön létre, így **nincs szükség külső szerverre, port-továbbításra vagy router beállításokra**!

---

## ⌨️ Gyorsbillentyűk (Szudoku)

- **1-9**: Szám beírása a kijelölt mezőbe (vagy jegyzetelés jegyzet módban)
- **Del / Backspace / 0**: Kijelölt mező törlése
- **Nyílbillentyűk (↑, ↓, ←, →)**: Mozgás a táblán
- **N**: Jegyzet (Ceruza) mód ki-/bekapcsolása
- **Z vagy Ctrl+Z**: Utolsó művelet visszavonása
- **H**: Segítség kérése (egy mező feltárása)

---

## 🔊 Beépített Hangok
A játék a Web Audio API-t használja, így semmilyen külső audiofájlra nincs szükség. A fejlécben lévő 🔊 gombbal a hang bármikor némítható.

Jó szórakozást és sok győzelmet! 🏆
