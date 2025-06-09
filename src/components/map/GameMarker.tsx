import React from 'react';
import { Marker } from 'react-map-gl';
import { Game } from '../../types/game';

interface GameMarkerProps {
  game: Game;
  gameCount?: number;
  onMarkerClick: (game: Game) => void;
}

const GameMarker: React.FC<GameMarkerProps> = ({ game, gameCount = 1, onMarkerClick }) => {
  return (
    <Marker
      longitude={Number(game.longitude)}
      latitude={Number(game.latitude)}
      anchor="bottom"
    >
      <div
        className="cursor-pointer transform hover:scale-110 transition-transform duration-200"
        onClick={() => onMarkerClick(game)}
      >
        <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg border-2 border-white">
          {gameCount > 1 ? (
            <span className="text-xs font-bold">{gameCount}</span>
          ) : (
            <span className="text-xs font-bold">{game.sport.charAt(0).toUpperCase()}</span>
          )}
        </div>
      </div>
    </Marker>
  );
};

export default GameMarker;