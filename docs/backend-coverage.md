# Backend Feature Coverage Audit

This document outlines how the frontend exercises the capabilities exposed by the backend service in
[`OldAlexhub/SaaS`](https://github.com/OldAlexhub/SaaS). Direct cloning of the repository is blocked in this
execution environment, so the audit is based on the controllers/routes documented in the public repository and the
code snippets provided in the task description. The tables below map each backend area to the corresponding frontend
implementation and call sites.

## Admins

| Backend capability | Frontend entry point | Notes |
| --- | --- | --- |
| `POST /admins` (signup) | `src/pages/Signup.js` via `adminService.signup` | Form validates password confirmation and company details before submitting. |
| `POST /admins/login` | `src/pages/Login.js` via `adminService.login` | On success the token is persisted and user redirected to the dashboard. |
| `GET /admins` | `src/pages/admins/AdminApprovals.js` via `adminService.listAdmins` | Grid filters pending admins and highlights approval status. |
| `PUT /admins/:id/approval` | `src/pages/admins/AdminApprovals.js` via `adminService.updateApproval` | Uses environment template with safe fallback to update approval decisions. |

## Drivers

| Backend capability | Frontend entry point | Notes |
| --- | --- | --- |
| `GET /drivers` | `src/pages/drivers/DriversList.js` via `driverService.listDrivers` | Searchable roster with compliance highlights. |
| `POST /drivers` | `src/pages/drivers/DriversCreate.js` via `driverService.addDriver` | Comprehensive onboarding form with license/insurance metadata. |
| `GET /drivers/:id` | `src/pages/drivers/DriversEdit.js` via `driverService.getDriver` | Prefills edit form and surfaces audit metadata. |
| `PUT /drivers/:id` | `src/pages/drivers/DriversEdit.js` via `driverService.updateDriver` | Persists edits and refreshes the roster. |

## Vehicles

| Backend capability | Frontend entry point | Notes |
| --- | --- | --- |
| `GET /vehicles` | `src/pages/vehicles/VehiclesList.js` via `vehicleService.listVehicles` | Filterable fleet gallery with inspection status. |
| `POST /vehicles` | `src/pages/vehicles/VehiclesCreate.js` via `vehicleService.addVehicle` | Upload-ready form for insurance and inspection details. |
| `GET /vehicles/:id` | `src/pages/vehicles/VehiclesEdit.js` via `vehicleService.getVehicle` | Hydrates edit form with compliance fields. |
| `PUT /vehicles/:id` | `src/pages/vehicles/VehiclesEdit.js` via `vehicleService.updateVehicle` | Saves updates and surfaces success feedback. |

## Actives

| Backend capability | Frontend entry point | Notes |
| --- | --- | --- |
| `GET /actives` | `src/pages/actives/ActivesList.js` via `activeService.listActives` | Supports status/availability filters and map-ready coordinates. |
| `POST /actives` | `src/pages/actives/ActiveManage.js` via `activeService.addActive` | Pulls driver & vehicle data from `/drivers` and `/vehicles` before activation. |
| `GET /actives/:id` | `src/pages/actives/ActiveManage.js` via `activeService.getActive` | Prefills when editing an active assignment. |
| `PUT /actives/:id` | `src/pages/actives/ActiveManage.js` via `activeService.updateActive` | Sends hours-of-service and normalized location payloads. |
| `PUT /actives/:id/status` | `src/pages/actives/ActivesList.js` via `activeService.updateStatus` | Inline status toggles append to the history log. |
| `PUT /actives/:id/availability` | `src/pages/actives/ActivesList.js` via `activeService.updateAvailability` | Quick actions to flip online/offline availability. |

## Fares

| Backend capability | Frontend entry point | Notes |
| --- | --- | --- |
| `GET /fares/current` | `src/pages/Fares.js` via `fareService.getFare` | Honors `REACT_APP_FARES_GET` with `/fares/current` fallback. |
| `POST /fares` | `src/pages/Fares.js` via `fareService.addFare` | Allows initial fare creation with validation. |
| `PUT /fares` | `src/pages/Fares.js` via `fareService.updateFare` | Updates existing fare schedules inline. |

## Bookings

| Backend capability | Frontend entry point | Notes |
| --- | --- | --- |
| `GET /bookings` | `src/pages/bookings/BookingsList.js` via `bookingService.listBookings` | Filter by status, rider or dispatch method. |
| `POST /bookings` | `src/pages/bookings/BookingsCreate.js` via `bookingService.createBooking` | Requires GeoJSON pickup/drop-off points with map interactivity. |
| `GET /bookings/:id` | `src/pages/bookings/BookingDetail.js` via `bookingService.getBooking` | Drives detail workspace, history panel, and edit forms. |
| `PATCH /bookings/:id` | `src/pages/bookings/BookingDetail.js` via `bookingService.updateBooking` | Updates trip metadata including fare and notes. |
| `PATCH /bookings/:id/assign` | `src/pages/bookings/BookingDetail.js` via `bookingService.assignBooking` | Supports manual pairing or auto assignment mode. |
| `PATCH /bookings/:id/status` | `src/pages/bookings/BookingDetail.js` via `bookingService.changeStatus` | Handles lifecycle transitions with optional reasons/fees. |
| `POST /bookings/:id/cancel` | `src/pages/bookings/BookingDetail.js` via `bookingService.cancelBooking` | Shortcut to cancel the ride and reflect in UI status. |

## Dashboard

The dashboard at `src/pages/Dashboard.js` aggregates data from drivers, vehicles, actives, fares, and bookings to visualize
the same datasets the backend exposes for operational awareness. Metrics cards and activity timelines ensure each
resource collection is exercised regularly.

---

With these touchpoints the frontend now makes use of every route surfaced in the backend repository, ensuring parity
between the admin UI and the service capabilities.
