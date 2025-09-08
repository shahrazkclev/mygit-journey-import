import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Star, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Review {
  id: string;
  user_name: string;
  user_email: string;
  rating: number;
  description: string;
  media_url: string;
  media_type: string;
  user_avatar: string;
  user_instagram_handle: string;
  created_at: string;
  is_active: boolean;
}

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUnmutedGlobally, setIsUnmutedGlobally] = useState(false);
  const carouselWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchReviews();
  }, []);

  // Ensure all videos are paused on mount and when reviews change
  useEffect(() => {
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      video.pause();
      video.currentTime = 0;
    });
    
    // Initialize mute button positions for all cards (both video and non-video)
    setTimeout(() => {
      updateAllCardsState();
    }, 100);
  }, [reviews]);

  // Pause all videos when user switches tabs
  useEffect(() => {
    const pauseAllVideos = () => {
      const videos = document.querySelectorAll('video');
      videos.forEach(video => {
        if (!video.paused) {
          video.pause();
          video.currentTime = 0;
        }
      });
    };

    // Pause videos on window blur (when user switches tabs)
    const handleBlur = () => {
      pauseAllVideos();
    };

    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  useEffect(() => {
    const carouselWrapper = carouselWrapperRef.current;
    if (!carouselWrapper) return;

    // Drag to Scroll functionality
    let isDown = false;
    let startX: number;
    let scrollLeft: number;

    const handleMouseDown = (e: MouseEvent) => {
      isDown = true;
      carouselWrapper.classList.add('grabbing');
      startX = e.pageX - carouselWrapper.offsetLeft;
      scrollLeft = carouselWrapper.scrollLeft;
    };

    const handleMouseLeave = () => {
      isDown = false;
      carouselWrapper.classList.remove('grabbing');
    };

    const handleMouseUp = () => {
      isDown = false;
      carouselWrapper.classList.remove('grabbing');
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - carouselWrapper.offsetLeft;
      const walk = (x - startX) * 3;
      carouselWrapper.scrollLeft = scrollLeft - walk;
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        carouselWrapper.scrollLeft += e.deltaY * 1.5; // Consistent scrolling
      }
    };

    // Mobile scroll detection for pop-out animation
    const handleScroll = () => {
      const cards = carouselWrapper.querySelectorAll('.video-card');
      cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.left + rect.width / 2;
        const viewportCenter = window.innerWidth / 2;
        const distanceFromCenter = Math.abs(cardCenter - viewportCenter);
        const maxDistance = window.innerWidth / 2;
        
        // Only scale if card is close to center of viewport
        if (distanceFromCenter < maxDistance * 0.6) {
          card.classList.add('scale-105');
        } else {
          card.classList.remove('scale-105');
        }
      });
    };

    carouselWrapper.addEventListener('mousedown', handleMouseDown);
    carouselWrapper.addEventListener('mouseleave', handleMouseLeave);
    carouselWrapper.addEventListener('mouseup', handleMouseUp);
    carouselWrapper.addEventListener('mousemove', handleMouseMove);
    carouselWrapper.addEventListener('wheel', handleWheel);
    carouselWrapper.addEventListener('scroll', handleScroll);

    // Initial call to set up the first card state
    handleScroll();

    return () => {
      carouselWrapper.removeEventListener('mousedown', handleMouseDown);
      carouselWrapper.removeEventListener('mouseleave', handleMouseLeave);
      carouselWrapper.removeEventListener('mouseup', handleMouseUp);
      carouselWrapper.removeEventListener('mousemove', handleMouseMove);
      carouselWrapper.removeEventListener('wheel', handleWheel);
      carouselWrapper.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <svg
        key={i}
        className="w-4 h-4 text-yellow-400"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.445a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.367-2.445a1 1 0 00-1.175 0l-3.367 2.445c-.784.57-1.838-.197-1.54-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.049 2.927z" />
      </svg>
    ));
  };


  const updateCardState = (card: HTMLElement) => {
    const video = card.querySelector('video');
    const muteBtn = card.querySelector('.mute-btn');
    const iconSvgs = card.querySelectorAll('.mute-icon-svg');
    const mutedIcon = card.querySelector('#muted-icon');
    const unmutedIcon = card.querySelector('#unmuted-icon');
    if (!video || !muteBtn || !mutedIcon || !unmutedIcon) return;

    video.muted = !isUnmutedGlobally;

    mutedIcon.classList.toggle('hidden', isUnmutedGlobally);
    unmutedIcon.classList.toggle('hidden', !isUnmutedGlobally);

    const isMuted = !isUnmutedGlobally;
    
    const isCentered = muteBtn.classList.contains('top-1/3');

    if (isMuted && !isCentered) {
      // Move to center
      muteBtn.classList.remove('top-4', 'right-4', 'p-1.5');
      muteBtn.classList.add('top-1/3', 'left-1/2', '-translate-x-1/2', '-translate-y-1/2', 'p-4');
      iconSvgs.forEach(svg => {
        svg.classList.remove('w-5', 'h-5');
        svg.classList.add('w-10', 'h-10');
      });
    } else if (!isMuted && isCentered) {
      // Move to corner
       muteBtn.classList.remove('top-1/3', 'left-1/2', '-translate-x-1/2', '-translate-y-1/2', 'p-4');
      muteBtn.classList.add('top-4', 'right-4', 'p-1.5');
      iconSvgs.forEach(svg => {
        svg.classList.remove('w-10', 'h-10');
        svg.classList.add('w-5', 'h-5');
      });
    }
  };

  const toggleMute = () => {
    setIsUnmutedGlobally(!isUnmutedGlobally);
    // Update all cards to reflect the global state change
    const videoCards = document.querySelectorAll('.video-card');
    videoCards.forEach(updateCardState);
  };

  // Initialize mute button positions on component mount
  useEffect(() => {
    setTimeout(() => {
      const videoCards = document.querySelectorAll('.video-card');
      videoCards.forEach(updateCardState);
    }, 500);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading reviews...</p>
          </div>
        </div>
      </div>
    );
  }

  // Create temporary example cards for testing
  const tempCards = [
    {
      id: 'temp-1',
      user_name: 'Alex',
      rating: 5,
      description: 'Amazing product! Love it so much.',
      media_url: 'https://pub-58b2e6b3b8ef4be694df2e8337a051bb.r2.dev/Final%20preview)(1)(1).mp4',
      media_type: 'video',
      user_instagram_handle: 'alex_dev'
    },
    {
      id: 'temp-2',
      user_name: 'Sarah',
      rating: 4,
      description: 'Great quality and fast shipping.',
      media_url: 'https://pub-58b2e6b3b8ef4be694df2e8337a051bb.r2.dev/Pindown.io_1726303291.mp4',
      media_type: 'video',
      user_instagram_handle: 'sarah_photo'
    },
    {
      id: 'temp-3',
      user_name: 'Mike',
      rating: 5,
      description: 'Perfect! Exactly what I was looking for.',
      media_url: 'https://pub-58b2e6b3b8ef4be694df2e8337a051bb.r2.dev/Pindown.io_1726303291.mp4',
      media_type: 'video',
      user_instagram_handle: 'mike_tech'
    },
    {
      id: 'temp-4',
      user_name: 'Emma',
      rating: 5,
      description: 'Highly recommend this to everyone!',
      media_url: 'https://pub-58b2e6b3b8ef4be694df2e8337a051bb.r2.dev/Final%20preview)(1)(1).mp4',
      media_type: 'video',
      user_instagram_handle: 'emma_lifestyle'
    },
    {
      id: 'temp-5',
      user_name: 'David',
      rating: 4,
      description: 'Good product, will buy again.',
      media_url: '',
      media_type: 'image',
      user_instagram_handle: 'david_reviews'
    }
  ];

  // Combine real reviews with temp cards
  const allCards = [...reviews, ...tempCards];

  return (
    <div className="min-h-screen bg-transparent text-gray-800 font-sans flex items-center justify-center">
      {/* Main Content */}
      <div className="w-full max-w-6xl mx-auto relative py-8">
        {/* Horizontal Scrolling Container */}
        <div 
          ref={carouselWrapperRef}
          className="no-scrollbar w-full overflow-x-scroll scroll-smooth grab px-4"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitScrollbar: { display: 'none' }
          }}
        >
          {/* Cards Container */}
          <div className="flex gap-8 py-8 px-8">
            {allCards.map((review) => (
                <div 
                  key={review.id} 
                  className="video-card relative w-72 h-[28rem] flex-shrink-0 rounded-2xl overflow-hidden transition-all duration-500 ease-in-out hover:scale-105 shadow-lg group"
                  onClick={(e) => {
                    // No click behavior needed - videos play on hover automatically
                    // This keeps the click handler for potential future features
                  }}
                  onMouseEnter={(e) => {
                    // Exact logic from HTML
                    if (review.media_type === 'video') {
                      const video = e.currentTarget.querySelector('video');
                      if (video) {
                        updateCardState(e.currentTarget);
                        const playPromise = video.play();
                        if (playPromise !== undefined) {
                          playPromise.catch(error => console.log("Autoplay failed.", error));
                        }
                      }
                    }
                  }}
                  onMouseLeave={(e) => {
                    // Exact logic from HTML
                    if (review.media_type === 'video') {
                      const video = e.currentTarget.querySelector('video');
                      if (video) {
                        video.pause();
                      }
                    }
                  }}
                >
                  {/* Consistent media rendering logic */}
                  {review.media_url && review.media_type === 'video' ? (
                    <video 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                      muted={true}
                      loop 
                      playsInline 
                      preload="metadata"
                      controls={false}
                      autoPlay={false}
                      src={review.media_url}
                    />
                  ) : review.media_url && review.media_type === 'image' ? (
                    <img 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                      src={review.media_url}
                      alt="Review"
                    />
                  ) : (
                    <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 transition-transform duration-500 group-hover:scale-110" />
                  )}
                  
                  {/* Consistent overlay for all cards */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                  
                  {/* Mute button - only for video cards, controls audio only */}
                  {review.media_type === 'video' && (
                    <button 
                      className="mute-btn absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-black/30 rounded-full backdrop-blur-sm transition-all duration-300 opacity-0 group-hover:opacity-100 hover:bg-black/50"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMute();
                      }}
                    >
                      <svg className="w-10 h-10 text-white hidden mute-icon-svg" id="unmuted-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                      <svg className="w-10 h-10 text-white mute-icon-svg" id="muted-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l4-4m0 4l-4-4" />
                      </svg>
                    </button>
                  )}

                  <div className="relative z-10 p-4 flex flex-col justify-end h-full text-white select-none">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-1">
                        {renderStars(review.rating)}
                      </div>
                      <p className="text-sm text-white/90 line-clamp-2">
                        "{review.description}"
                      </p>
                      <div className="flex items-center space-x-2 text-sm">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-white">
                          {review.user_name.charAt(0).toUpperCase()}
                        </div>
                        {review.user_instagram_handle && (
                          <a 
                            href={`https://instagram.com/${review.user_instagram_handle.replace('@', '')}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex items-center space-x-1.5 group"
                          >
                            <svg className="w-4 h-4 text-white/80 group-hover:text-blue-300" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.85s-.011 3.585-.069 4.85c-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.85-.07-3.252-.148-4.771-1.691-4.919-4.919-.058-1.265-.069-1.645-.069-4.85s.011-3.585.069-4.85c.149-3.225 1.664 4.771 4.919-4.919 1.266-.057 1.644-.07 4.85-.07zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948s-.014-3.667-.072-4.947c-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.689-.073-4.948-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.162 6.162 6.162 6.162-2.759 6.162-6.162-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4s1.791-4 4-4 4 1.79 4 4-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44 1.441-.645 1.441-1.44-.645-1.44-1.441-1.44z" />
                            </svg>
                            <span className="font-medium text-white group-hover:text-blue-300 transition-colors">
                              @{review.user_instagram_handle.replace('@', '')}
                            </span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
