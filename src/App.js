import React, { useState, useEffect } from "react";
import cosineSimilarity from "cosine-similarity";
import './MovieRecommender.css';

const API_TOKEN = "TOKEN";
const HUGGING_FACE_TOKEN = "TOKEN";


const emotionToGenre = {
  anger: [28, 53, 80, 9648], // acción, suspense, crimen, suspense
  disgust: [53, 12, 80], // suspense , aventura, crimen
  fear: [27, 53, 80, 9648], // terror, suspense, crimen, misteri
  joy: [35, 12, 10402, 10751], // comedia, aventura, musical familia
  sadness: [18, 10749], // drama, romance
  surprise: [28, 12, 16, 9648, 878], // acción, aventura, animacion, misterio, ciencia ficcion
};

async function analyzeEmotion(text) {
  console.log("Texto analizado:", text);

  const response = await fetch("https://api-inference.huggingface.co/models/j-hartmann/emotion-english-distilroberta-base", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HUGGING_FACE_TOKEN}`,
      "Content-Type": "application/json",
    }, 
    body: JSON.stringify({ inputs: text }),
  });

  const data = await response.json();
  console.log("Respuesta de la API de emociones:", data);

  if (!Array.isArray(data) || data.length === 0) return null;

  const bestEmotion = data[0].sort((a, b) => b.score - a.score)[0].label;
  console.log("Emoción detectada con mayor puntuación:", bestEmotion);

  if (bestEmotion === "neutral") {
    return null;
  }


  return emotionToGenre[bestEmotion] ? emotionToGenre[bestEmotion] : null;
}


const fetchGenres = async () => {
  const res = await fetch("https://api.themoviedb.org/3/genre/movie/list?language=es", {
    headers: { Authorization: `Bearer ${API_TOKEN}` },
  });

  const data = await res.json();
  console.log("Géneros obtenidos de TMDB:", data.genres);

  return data.genres.reduce((acc, genre) => {
    acc[genre.id] = genre.name;
    return acc;
  }, {});
};


const fetchMovies = async (genres) => {
  if (!genres || genres.length === 0) return [];

  const allMovies = [];

  for (const genreId of genres) {
    const url = `https://api.themoviedb.org/3/discover/movie?vote_average.gte=7&sort_by=popularity.desc&with_genres=${genreId}&page=${Math.floor(Math.random() * 5) + 1}`;
    
    const res = await fetch(url, { headers: { Authorization: `Bearer ${API_TOKEN}` } });
    const data = await res.json();

    if (data.results) {
      const filtered = data.results.filter(movie => movie.vote_count > 700);
      allMovies.push(...filtered);
    }
  }

  // Eliminar duplicados
  const uniqueMoviesMap = {};
  allMovies.forEach(movie => {
    uniqueMoviesMap[movie.id] = movie;
  });

  return Object.values(uniqueMoviesMap).slice(0, 5);
};




const MovieRecommender = () => {
  const [userId, setUserId] = useState("");
  const [emotion, setEmotion] = useState("");
  const [movies, setMovies] = useState([]);
  const [genreMap, setGenreMap] = useState({});
  const [watchedMovies, setWatchedMovies] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false); 
  const [hasGeneratedMovies, setHasGeneratedMovies] = useState(false);
  const [currentTab, setCurrentTab] = useState("recommend");


  useEffect(() => {
    fetchGenres().then(setGenreMap);
  }, []);

  const handleEmotionSubmit = async () => {
    if (!genreMap || Object.keys(genreMap).length === 0) {
      alert("Los géneros aún no han sido cargados. Intenta de nuevo.");
      return;
    }
  
    const analyzedEmotion = await analyzeEmotion(emotion);
      if (!analyzedEmotion) {
      alert("No se puede recomendar películas para la emoción detectada.");
      return;
    }
  
    fetchMovies(analyzedEmotion).then((movies) => {
      const sortedMovies = rankMoviesBySimilarity(movies, watchedMovies);
      setMovies(sortedMovies);
      setHasGeneratedMovies(true);
    });

    if (!analyzedEmotion) {
      alert("No se puede recomendar películas para la emoción detectada. Mostrando comedias...");
      fetchMovies([35]).then(setMovies);
      return;
    }    
  };
  

  const handleRegenerateMovies = async () => {
    if (!emotion) return;
    
    console.log("Regenerando nuevas películas...");
    
    const analyzedEmotion = await analyzeEmotion(emotion, genreMap);

    if (!analyzedEmotion || analyzedEmotion === "neutral") {
      alert("Se ha detectado una emoción neutral. Recomendando películas de comedia...");
      fetchMovies([35]).then((movies) => {
        console.log("Películas de comedia obtenidas:", movies); 
        setMovies(movies);
        setHasGeneratedMovies(true);
      });
      return;
    }


    if (!analyzedEmotion) {
      alert("No se puede recomendar películas para la emoción detectada.");
      return;
    }
    
    const genres = emotionToGenre[analyzedEmotion];
    fetchMovies(genres).then((movies) => {
      const sortedMovies = rankMoviesBySimilarity(movies, watchedMovies);
      setMovies(sortedMovies);
      console.log("Nuevas películas generadas:", sortedMovies);
    });
  };


  const markAsWatched = (movie) => {
    console.log("Película marcada como vista:", movie.title);
  
    setWatchedMovies((prev) => {
      const updatedMovies = [...prev, movie];
      localStorage.setItem(userId, JSON.stringify(updatedMovies));
      return updatedMovies;
    });
    setCurrentTab("watched"); 
  };
  
  
  

  const rankMoviesBySimilarity = (recommendedMovies, watchedMovies) => {
    if (watchedMovies.length === 0) return recommendedMovies;
  
    console.log("Películas vistas:", watchedMovies);
    console.log("Películas recomendadas antes de ordenar:", recommendedMovies);
  
    return recommendedMovies
      .map((movie) => {
        const similarities = watchedMovies.map((watched) => {
          const genreVector1 = getGenreVector(movie.genre_ids);
          const genreVector2 = getGenreVector(watched.genre_ids);
          return cosineSimilarity(genreVector1, genreVector2);
        });
  
        console.log(`Similitudes de ${movie.title}:`, similarities);
  
        const maxSimilarity = Math.max(...similarities, 0);
        return { ...movie, similarity: maxSimilarity };
      })
      .sort((a, b) => b.similarity - a.similarity);
  };
  
  
  const getGenreVector = (genreIds) => {
    const allGenres = Object.keys(genreMap).map(Number);
    const genreVector = allGenres.map((id) => (genreIds.includes(id) ? 1 : 0));  
    return genreVector;
  };


  return (
    <div>
      <h1>Emotion Driven Movie Recommender</h1>
      <input 
  type="text" 
  placeholder="Enter your ID" 
  value={userId} 
  onChange={(e) => setUserId(e.target.value)} 
  onKeyPress={(e) => {
    if (e.key === "Enter" && userId.trim() !== "") {
      setIsLoggedIn(true); // Activa las pestañas al ingresar el ID
      setWatchedMovies(JSON.parse(localStorage.getItem(userId)) || []); // Cargar películas vistas
    }
  }}
/>
{isLoggedIn && (
  <div>
    <button onClick={() => setCurrentTab("recommend")}>Recomendar Películas</button>
    <button onClick={() => setCurrentTab("watched")}>Películas Vistas</button>
  </div>
)}
{isLoggedIn && currentTab === "recommend" &&(
  <>
    <input 
      type="text" 
      placeholder="How are you feeling?" 
      value={emotion} 
      onChange={(e) => setEmotion(e.target.value)} 
    />
    <button onClick={handleEmotionSubmit}>Buscar Películas</button>

    {isLoggedIn && currentTab === "recommend" && hasGeneratedMovies && (
      <div>
        <button onClick={handleRegenerateMovies}>Generar Nuevas Películas</button>
        <table border="1">
          <thead>
            <tr>
              <th>Poster</th>
              <th>Title</th>
              <th>Genres</th>
              <th>Overview</th>
              <th>Rating</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {movies.map((movie) => (
              <tr key={movie.id}>
                <td>
                  <img src={`https://image.tmdb.org/t/p/w200${movie.poster_path}`} alt={movie.title} />
                </td>
                <td>{movie.title} ({movie.release_date?.split("-")[0]})</td>
                <td>{movie.genre_ids.map(id => genreMap[id]).join(", ")}</td>
                <td>{movie.overview}</td>
                <td>{movie.vote_average} / 10</td>
                <td>
                  <button onClick={() => markAsWatched(movie)}>Mark as Watched</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </>
)}


{isLoggedIn && currentTab === "watched" && (
  <div>
    <h2>Watched Movies</h2>
    {watchedMovies.length === 0 ? (
      <p>You haven't watched any movies yet.</p>
    ) : (
      <ul>
        {watchedMovies.map((movie) => (
          <li key={movie.id}>{movie.title} ({movie.release_date?.split("-")[0]})</li>
        ))}
      </ul>
    )}
  </div>
)}


    </div>
  );
};

export default MovieRecommender;