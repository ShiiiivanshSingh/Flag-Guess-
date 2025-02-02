const API_URL = "https://restcountries.com/v3.1/all";
const DIFFICULTY_LEVELS = {
  easy: { pointMultiplier: 1, minLetters: 2 },
  medium: { pointMultiplier: 2, minLetters: 3 },
  hard: { pointMultiplier: 3, minLetters: 4 },
};




  document.addEventListener("DOMContentLoaded", function() {
    const menuBtn = document.getElementById("menu-btn");
    const menu = document.getElementById("menu");
  
    if (menuBtn && menu) {
      menuBtn.addEventListener("click", function() {
        menu.classList.toggle("hidden");
        menu.classList.toggle("show");
      });
    } else {
      console.error("Menu button or menu not found.");
    }
  });
  

  
class FlagGuessingGame {
  constructor() {
    this.countries = [];
    this.currentFlag = null;
    this.score = 0;
    this.lives = 3;
    this.difficulty = "easy";
    this.playerName = "";
    this.roundNumber = 1;
    this.shownFlags = [];  
    this.elements = {
      landingPage: document.getElementById("landing-page"),
      gameContainer: document.getElementById("game-container"),
      playerNameInput: document.getElementById("player-name"),
      startGameBtn: document.getElementById("start-game-btn"),
      playerGreeting: document.getElementById("player-greeting"),
      flagImage: document.getElementById("flag-image"),
      guessInput: document.getElementById("guess"),
      submitBtn: document.getElementById("submit-btn"),
      skipFlagBtn: document.getElementById("skip-flag-btn"),
      suggestionsContainer: document.getElementById("suggestions"),
      resultElement: document.getElementById("result"),
      scoreElement: document.getElementById("score-value"),
      livesElement: document.getElementById("lives"),
      hintElement: document.getElementById("hint"),
      difficultyScreen: document.getElementById("difficulty-screen"),
      difficultyButtons: {
        easy: document.getElementById("easy-btn"),
        medium: document.getElementById("medium-btn"),
        hard: document.getElementById("hard-btn"),
      },
      difficultyLabel: document.getElementById("difficulty-label"),
      gameOverScreen: document.getElementById("game-over-screen"),
      finalScore: document.getElementById("final-score"),
      restartBtn: document.getElementById("restart-btn"),
      homeBtn: document.getElementById("home-btn-fixed-element"),
    };

    this.init();
  }

  async init() {
    const res = await fetch(API_URL);
    this.countries = await res.json();
    this.addEventListeners();
  }

  addEventListeners() {

  
    this.elements.startGameBtn.addEventListener("click", () => {
      this.playerName = this.elements.playerNameInput.value.trim();
      if (this.playerName) {
        this.startGame();
      }
    });

    this.elements.difficultyButtons.easy.addEventListener("click", () => {
      this.setDifficulty("easy");
    });

    this.elements.difficultyButtons.medium.addEventListener("click", () => {
      this.setDifficulty("medium");
    });

    this.elements.difficultyButtons.hard.addEventListener("click", () => {
      this.setDifficulty("hard");
    });

    this.elements.submitBtn.addEventListener("click", () => {
      this.checkAnswer();
    });

    this.elements.skipFlagBtn.addEventListener("click", () => {
      this.skipFlag();
    });

    this.elements.restartBtn.addEventListener("click", () => {
      this.resetGame();
    });

    this.elements.homeBtn.addEventListener("click", () => {
      window.location.reload();
    });

    this.elements.guessInput.addEventListener("input", (e) => {
      this.filterSuggestions(e.target.value);
    });
  }

  startGame() {
    this.elements.landingPage.classList.add("hidden");
    this.elements.difficultyScreen.classList.remove("hidden");
  }

  setDifficulty(difficulty) {
    this.difficulty = difficulty;
    this.elements.difficultyLabel.textContent = `Difficulty: ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}`;
    this.elements.difficultyScreen.classList.add("hidden");
    this.elements.gameContainer.classList.remove("hidden");
    this.startRound();
  }

  startRound() {
    this.currentFlag = this.getRandomFlag();
    this.elements.flagImage.src = this.currentFlag.flags.png;
    this.elements.resultElement.textContent = "";
    this.elements.guessInput.value = "";
    this.elements.suggestionsContainer.innerHTML = "";

    this.showHint();
  }


  
  getRandomFlag() {
    const availableFlags = this.countries.filter(country => !this.shownFlags.includes(country));
    
    
    if (availableFlags.length === 0) {
      this.shownFlags = [];
      return this.getRandomFlag(); 
    }

    const randomIndex = Math.floor(Math.random() * availableFlags.length);
    const selectedFlag = availableFlags[randomIndex];
    this.shownFlags.push(selectedFlag);

    return selectedFlag;
  }

  showHint() {
    let hintText = "";

    if (this.difficulty === "easy") {
      hintText = `Hint: The capital city of this country is ${this.getCapitalCity(this.currentFlag)}`;
    } else if (this.difficulty === "medium") {
      hintText = `Hint: This country is located in ${this.getContinent(this.currentFlag)}`;
    } else if (this.difficulty === "hard") {
      hintText = `Hint: The capital city is ${this.getCapitalCity(this.currentFlag)} and it is located in ${this.getContinent(this.currentFlag)}`;
    }

    this.elements.hintElement.textContent = hintText;
  }

  getCapitalCity(country) {
    return country.capital ? country.capital[0] : "an unknown capital";
  }

  getContinent(country) {
    return country.region || "an unknown continent";
  }

  async checkAnswer() {
    // Show loading spinner
    document.getElementById('loading-spinner').classList.remove('hidden');
    
    const guess = this.elements.guessInput.value.trim().toLowerCase();
    const correctAnswer = this.currentFlag.name.common.toLowerCase();

    if (guess === correctAnswer) {
      // Add score animation
      this.elements.scoreElement.classList.add('score-animation');
      setTimeout(() => {
        this.elements.scoreElement.classList.remove('score-animation');
      }, 500);

      this.score += DIFFICULTY_LEVELS[this.difficulty].pointMultiplier;
      this.updateScoreAndLives();
      
      // Add success message with country info
      this.showSuccessMessage();
    } else {
      this.lives -= 1;
      this.updateScoreAndLives();
      this.showErrorMessage();
    }

    // Hide loading spinner
    document.getElementById('loading-spinner').classList.add('hidden');

    if (this.lives <= 0) {
      this.endGame();
      return;
    }

    setTimeout(() => {
      this.startRound();
    }, 1500);
  }

  showSuccessMessage() {
    const country = this.currentFlag;
    const message = `
      <div class="bg-green-100 p-4 rounded-lg mb-4">
        <p class="text-green-800">Correct! 🎉</p>
        <p class="text-sm mt-2">Population: ${this.formatNumber(country.population)}</p>
        <p class="text-sm">Region: ${country.region}</p>
      </div>
    `;
    this.elements.resultElement.innerHTML = message;
  }

  showErrorMessage() {
    const message = `
      <div class="bg-red-100 p-4 rounded-lg mb-4">
        <p class="text-red-800">Incorrect! The correct answer was ${this.currentFlag.name.common}</p>
      </div>
    `;
    this.elements.resultElement.innerHTML = message;
  }

  formatNumber(num) {
    return new Intl.NumberFormat().format(num);
  }

  skipFlag() {
    this.lives -= 1;
    this.updateScoreAndLives();
    if (this.lives <= 0) {
      this.endGame();
    } else {
      this.roundNumber++;
      this.startRound();
    }
  }

  updateScoreAndLives() {
    this.elements.scoreElement.textContent = this.score;
    this.elements.livesElement.textContent = "❤️ ".repeat(this.lives);
  }

  endGame() {
    this.elements.gameContainer.classList.add('hidden');
    this.elements.gameOverScreen.classList.remove('hidden');
    
    // Show high score if it's a new record
    const highScore = localStorage.getItem('highScore') || 0;
    if (this.score > highScore) {
      localStorage.setItem('highScore', this.score);
      this.elements.finalScore.innerHTML = `
        <div class="text-2xl">
          🎉 New High Score! 🎉
          <br>
          ${this.score} points
        </div>
      `;
    } else {
      this.elements.finalScore.textContent = `Final Score: ${this.score}`;
    }
  }

  resetGame() {
    this.score = 0;
    this.lives = 3;
    this.roundNumber = 1;
    this.shownFlags = []; // Reset.
    this.updateScoreAndLives();
    this.elements.gameOverScreen.classList.add("hidden");
    this.elements.landingPage.classList.remove("hidden");
  }

  filterSuggestions(query) {
    const suggestions = this.countries.filter((country) =>
      country.name.common.toLowerCase().includes(query.toLowerCase())
    );

    // Clear 
    this.elements.suggestionsContainer.innerHTML = "";

    // Add 
    suggestions.forEach(country => {
      const suggestionElement = document.createElement("div");
      suggestionElement.textContent = country.name.common;
      suggestionElement.classList.add("suggestion-item");

      suggestionElement.addEventListener("click", () => {
        this.elements.guessInput.value = country.name.common;
        this.elements.suggestionsContainer.innerHTML = ""; // Clear suggestions 
      });

      this.elements.suggestionsContainer.appendChild(suggestionElement);
    });
  }
}

const game = new FlagGuessingGame();
