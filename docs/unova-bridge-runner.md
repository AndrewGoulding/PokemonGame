# The thirsty bridge runner

The runner follows the Black 2/White 2 script order: Skyarrow Bridge,
Driftveil Drawbridge, Tubeline Bridge, Village Bridge, Marvelous Bridge,
Marine Tube, then back to Skyarrow Bridge. Each of the first six meetings
asks for one Fresh Water. The final meeting awards twelve Moomoo Milks.
Skyarrow's merchant sells Fresh Water at the source price of ₽300.

Canceling or lacking water does not advance the runner. A full milk stack
leaves the final reward claimable without repeating the trip. Progress is
saved in the ordinary Unova state, and only the current stop displays the
runner. Existing saves start the optional quest without altering story
progress.

References: `res/field/scripts/{skyarrow_bridge,driftveil_drawbridge,
tubeline_bridge,village_bridge,marvelous_bridge,marine_tube}.s`, source
work variable `EVENT_WORK_0x4108`.
