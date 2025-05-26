# 🎓 Recomanador de pel·lícules basat en emocions

Aquest repositori conté el **codi font del Treball de Final de Grau (TFG)**, desenvolupat com a part dels estudis universitaris. El projecte consisteix en una aplicació que recomana pel·lícules en funció de l'emoció detectada en l'entrada de l'usuari mitjançant models d'aprenentatge automàtic.

## 📁 Contingut

- `App.js`: Component principal de React que integra l'anàlisi emocional i la recomanació de pel·lícules.
- `MovieRecommender.css`: Full d'estils per al component.
- `README.md`: Aquest document explicatiu.

## 🔧 Tecnologies i eines

- React.js
- Hugging Face API (model d'anàlisi emocional)
- TMDB API (The Movie Database)
- cosine-similarity

## 🚀 Com funciona

1. L'usuari introdueix com se sent.
2. Es detecta l'emoció dominant mitjançant un model preentrenat.
3. Es mapegen les emocions a gèneres cinematogràfics.
4. Es recuperen i ordenen pel·lícules populars i ben valorades.

## 📌 Notes

- Els **tokens API** han estat ocultats per a la publicació pública.
- Aquest codi forma part del TFG presentat a [Nom de la universitat o facultat, si vols afegir-ho].

## 📄 Llicència

Aquest projecte és per a finalitats acadèmiques. Consulta la llicència o contacta amb l'autor per a qualsevol ús diferent.
