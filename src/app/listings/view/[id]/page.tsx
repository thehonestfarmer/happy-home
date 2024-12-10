"use client";

import { SLIDES } from "@/app/fixtures";
import { DetailCarousel } from "@/app/ListingCarousel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import NextJsImage from "@/components/ui/nextjsimage";
import {
  Marker,
  APIProvider,
  Map,
  MapControl,
  ControlPosition,
} from "@vis.gl/react-google-maps";
import Link from "next/link";
import { useCallback, useState, useMemo } from "react";
import Lightbox from "yet-another-react-lightbox";

import { DrawerDialogDemo } from "@/app/InquiryDialog";
import { useAppContext } from "@/AppContext";
import { useLoadListings } from "@/hooks";
import { ChevronLeft, EyeIcon, HeartIcon, ShareIcon } from "lucide-react";
import { useParams } from "next/navigation";

/**
 * Determine the mobile operating system.
 * This function returns one of 'iOS', 'Android', 'Windows Phone', or 'unknown'.
 *
 * @returns {String}
 */
function getMobileOperatingSystem() {
  var userAgent = navigator.userAgent || navigator.vendor || window.opera;

  // Windows Phone must come first because its UA also contains "Android"
  if (/windows phone/i.test(userAgent)) {
    return "Windows Phone";
  }

  if (/android/i.test(userAgent)) {
    return "Android";
  }

  // iOS detection from: http://stackoverflow.com/a/9039885/177710
  if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
    return "iOS";
  }

  return "unknown";
}

type CustomZoomControlProps = {
  controlPosition: ControlPosition;
  zoom: number;
  onZoomChange: (zoom: number) => void;
};

const CustomZoomControl = ({
  controlPosition,
  zoom,
  onZoomChange,
}: CustomZoomControlProps) => {
  return (
    <MapControl position={controlPosition}>
      <div
        style={{
          margin: "10px",
          padding: "1em",
          background: "rgba(255,255,255,0.4)",
          display: "flex",
          flexFlow: "column nowrap",
        }}
      >
        <input
          id={"zoom"}
          type={"range"}
          min={1}
          max={18}
          step={"any"}
          value={zoom}
          onChange={(ev) => onZoomChange(ev.target.valueAsNumber)}
        />
      </div>
    </MapControl>
  );
};

export default function Page() {
  const params = useParams<{ id: string }>();
  // here we want to load/read the same json as the other root page
  const listings = useLoadListings();
  const property = listings[params.id];
  const { displayState, setDisplayState } = useAppContext();
  const [_, listingImageIdx = 0] = displayState.lightboxListingIdx ?? [];

  const handleLightboxOpen = useCallback(
    (idx: number, sIdx: number) => {
      setDisplayState((draft) => {
        draft.lightboxListingIdx = [parseInt(idx), sIdx];
      });
    },
    [setDisplayState],
  );

  const lightboxSlides = (property.listingImages ?? []).map((i, idx) => ({
    ...SLIDES[idx],
    src: i,
  }));

  const handleMailto = () => {
    const email = "demo@demo.com";
    const subject = "Hello";
    const body = "This is a test email.";
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    // Open the mailto link in a new window
    window.location.href = mailtoUrl;
  };
  const processedTags = property.tags.split(",");

  const isAndroid = getMobileOperatingSystem() === "Android";
  const [controlPosition, setControlControlPosition] =
    useState<ControlPosition>(ControlPosition.LEFT_BOTTOM);

  const [zoom, setZoom] = useState(6);
  const center = useMemo(() => ({ lat: 0, lng: 20 }), []);

  return (
    <div>
      <DetailCarousel
        handleOpen={handleLightboxOpen}
        property={property}
        allImages
      />
      <Lightbox
        open={displayState.lightboxListingIdx !== null}
        close={() =>
          setDisplayState((draft) => {
            draft.lightboxListingIdx = null;
          })
        }
        slides={lightboxSlides}
        render={{ slide: NextJsImage }}
        index={listingImageIdx}
      />
      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] md:p-4">
        <div className="flex justify-between p-4 bg-white rounded-lg shadow-sm">
          <div>
            <div className="text-center">
              <div className="text-xl font-bold text-black">
                $
                {(Math.round(property.priceUsd / 1000) * 1000).toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">Price</div>
            </div>
          </div>

          <div className="grid grid-cols-2">
            <div className="text-center">
              <div className="text-xl font-bold text-black">
                {parseInt(property.layout)}
              </div>
              <div className="text-sm text-gray-500">LDK</div>
            </div>

            <div className="text-center">
              <div className="text-xl font-bold text-black">
                {parseInt(property.landSqMeters)}
              </div>
              <div className="text-sm text-gray-500">Sq. Meters</div>
            </div>
          </div>
        </div>

        <div className="p-2 m-2 flex justify-between">
          <div>
            <Link href="/">
              <Button variant="outline">
                <ChevronLeft />
              </Button>
            </Link>
            <Button variant="outline">
              <EyeIcon />
            </Button>
          </div>

          <div>
            <Button
              variant="outline"
              onClick={() => {
                // if (navigator.share && !isAndroid) {
                //   navigator
                //     .share({
                //       title: document.title,
                //       url: window.location.href,
                //       text: "Check out this property in Niigata!",
                //     })
                //     .then(() => console.log("Successful share! 🎉"))
                //     .catch((err) => console.error(err));
                // }
                handleMailto();
                // open
                return;
              }}
            >
              <ShareIcon />
            </Button>
            <DrawerDialogDemo />
          </div>
        </div>

        <div className="p-4 bg-white rounded-b-lg">
          <h2 className="text-lg font-semibold text-black mb-2">
            About this home
          </h2>
          <p className="text-sm text-gray-600">
            {property.recommendedText.join(". ")}
          </p>
        </div>
        <div className="p-4">
          {processedTags.map((p) => (
            <Badge key={p} className="p-1 m-1" variant="outline">
              {p}
            </Badge>
          ))}
        </div>

        <APIProvider apiKey={"AIzaSyDch1GvBut5KKB5iHrmayfPEGv9PHYgMLI"}>
          <Map
            style={{ width: "100vw", height: "45vh" }}
            defaultCenter={{ lat: 37.782979, lng: 139.05652 }}
            zoom={zoom}
            gestureHandling={"greedy"}
            disableDefaultUI={false}
          >
            <Marker position={{ lat: 37.782979, lng: 139.05652 }} />
          </Map>
        </APIProvider>
      </div>
    </div>
  );
}
// <Button variant="outline">
//   <HeartIcon />
// </Button>
