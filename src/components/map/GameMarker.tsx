import React from 'react';
import { Marker } from 'react-map-gl';
import { MapPin } from 'lucide-react';
import { Game } from '../../types/game';

interface GameMarkerProps {
  game: Game;
  gameCount?: number;
  onMarkerClick: (game: Game) => void;
}

const GameMarker: React.FC<GameMarkerProps> = ({ game, gameCount, onMarkerClick }) => {
  return (
    <Marker
      longitude={Number(game.longitude)}
      latitude={Number(game.latitude)}
      anchor="bottom"
    >
      <div
        className="relative cursor-pointer transform hover:scale-110 transition-transform duration-200"
        onClick={() => onMarkerClick(game)}
      >
        <div className="bg-blue-600 text-white rounded-full p-2 shadow-lg border-2 border-white">
          <MapPin size={20} />
        </div>
        {gameCount && gameCount > 1 && (
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {gameCount}
          </div>
        )}
      </div>
    </Marker>
  );
};

export default GameMarker;