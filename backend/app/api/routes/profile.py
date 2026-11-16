
# """API routes for user profile management."""

# from fastapi import APIRouter, Depends
# from sqlalchemy.orm import Session

# from app.api.deps import get_current_user, get_db, require_roles
# from app.models.user import User, UserRole
# from app.schemas.profile import ProfileResponse, ProfileUpdateRequest
# from app.services.profile_service import (
#     get_user_profile,
#     update_user_profile,
# )

# router = APIRouter(prefix="/profile", tags=["Profile"])


# @router.get("/me", response_model=ProfileResponse)
# def read_my_profile(
#     current_user: User = Depends(get_current_user),
# ):
#     """Get the authenticated user's own profile."""
#     return current_user


# @router.patch("/me", response_model=ProfileResponse)
# def update_my_profile(
#     payload: ProfileUpdateRequest,
#     db: Session = Depends(get_db),
#     current_user: User = Depends(get_current_user),
# ):
#     """Update the authenticated user's own profile."""
#     return update_user_profile(db, current_user, payload)


# @router.get("/{user_id}", response_model=ProfileResponse)
# def read_user_profile(
#     user_id: int,
#     db: Session = Depends(get_db),
#     admin: User = Depends(require_roles(UserRole.ADMIN)),
# ):
#     """Allow administrators to view any user's profile."""
#     return get_user_profile(db, user_id)
# -------------------------------------

"""Profile management endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.profile import ProfileResponse, ProfileUpdateRequest

router = APIRouter(prefix="/profile", tags=["Profile"])


@router.get("/me", response_model=ProfileResponse)
def get_my_profile(
    current_user: User = Depends(get_current_user),
):
    """Retrieve the authenticated user's profile."""
    return current_user


@router.put("/me", response_model=ProfileResponse)
def update_my_profile(
    payload: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update permitted fields in the authenticated user's profile."""

    updates = payload.model_dump(exclude_unset=True)

    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide at least one field to update.",
        )

    for field, value in updates.items():
        if value is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{field} cannot be null.",
            )
        setattr(current_user, field, value)

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return current_user
