import { useState } from "react";
import { X } from "lucide-react";

import { updateMyProfile } from "../api/userApi.js";
import { uploadMediaFile } from "../api/uploadApi.js";

function EditProfileModal({ profileUser, onClose, onUpdated }) {
  const [fullName, setFullName] = useState(profileUser.full_name || "");
  const [bio, setBio] = useState(profileUser.bio || "");
  const [profileImageUrl, setProfileImageUrl] = useState(
    profileUser.profile_image_url || ""
  );
  const [bannerImageUrl, setBannerImageUrl] = useState(
    profileUser.banner_image_url || ""
  );

  const [saving, setSaving] = useState(false);
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
  const [uploadingBannerImage, setUploadingBannerImage] = useState(false);
  const [error, setError] = useState("");

  async function handleProfileImageChange(event) {
    const file = event.target.files[0];

    if (!file) return;

    setUploadingProfileImage(true);
    setError("");

    try {
      const result = await uploadMediaFile(file);
      setProfileImageUrl(result.data.media_url);
    } catch (error) {
      setError(error.message);
    } finally {
      setUploadingProfileImage(false);
    }
  }

  async function handleBannerImageChange(event) {
    const file = event.target.files[0];

    if (!file) return;

    setUploadingBannerImage(true);
    setError("");

    try {
      const result = await uploadMediaFile(file);
      setBannerImageUrl(result.data.media_url);
    } catch (error) {
      setError(error.message);
    } finally {
      setUploadingBannerImage(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      const result = await updateMyProfile({
        full_name: fullName,
        bio,
        profile_image_url: profileImageUrl,
        banner_image_url: bannerImageUrl,
      });

      onUpdated(result.data);
      onClose();
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="edit-profile-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="edit-profile-modal-header">
          <h2>Profili Düzenle</h2>

          <button type="button" onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        {error && <div className="error-message">{error}</div>}

        <form className="edit-profile-form" onSubmit={handleSubmit}>
          <label>
            Ad Soyad
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Ad Soyad"
            />
          </label>

          <label>
            Bio
            <textarea
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              placeholder="Kendinden bahset"
              maxLength={250}
            />
          </label>

          <div className="edit-upload-section">
            <span>Profil resmi</span>

            {profileImageUrl ? (
              <div className="edit-profile-image-preview">
                <img src={profileImageUrl} alt="profile preview" />
              </div>
            ) : (
              <p>Profil resmi yok.</p>
            )}

            <label className="file-upload-button">
              {uploadingProfileImage ? "Yükleniyor..." : "Profil resmi seç"}
              <input
                type="file"
                accept="image/*"
                onChange={handleProfileImageChange}
                disabled={uploadingProfileImage}
              />
            </label>

            {profileImageUrl && (
              <button
                type="button"
                className="remove-media-inline"
                onClick={() => setProfileImageUrl("")}
              >
                Profil resmini kaldır
              </button>
            )}
          </div>

          <div className="edit-upload-section">
            <span>Banner resmi</span>

            {bannerImageUrl ? (
              <div className="edit-banner-preview">
                <img src={bannerImageUrl} alt="banner preview" />
              </div>
            ) : (
              <p>Banner resmi yok.</p>
            )}

            <label className="file-upload-button">
              {uploadingBannerImage ? "Yükleniyor..." : "Banner seç"}
              <input
                type="file"
                accept="image/*"
                onChange={handleBannerImageChange}
                disabled={uploadingBannerImage}
              />
            </label>

            {bannerImageUrl && (
              <button
                type="button"
                className="remove-media-inline"
                onClick={() => setBannerImageUrl("")}
              >
                Bannerı kaldır
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={saving || uploadingProfileImage || uploadingBannerImage}
          >
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </form>
      </section>
    </div>
  );
}

export default EditProfileModal;
